import {
  ExecuteStatementCommand,
  RDSDataClient,
  type RDSDataClientConfig,
  type SqlParameter,
} from '@aws-sdk/client-rds-data';
import type { z } from 'zod';
import { expandTimeMacros, timeMacroValue, toSqlTimestamp, type TimeMacro } from '@/core/data/timeMacros';
import { AppError } from '@/core/errors/AppError';
import type { ResolvedRange } from '@/core/time/timeRange';
import type { DatasourceRuntime } from '@/plugins/OptionalPlugin';
import { wait } from '@/utils/wait';
import { awsCredentials, awsError } from './awsErrors';
import type { AuroraSettings, AwsSecrets, sqlSpecSchema } from './awsPlugin';
import { dataApiToFrame, type DataApiField } from './dataApiFrame';

/**
 * Aurora through the RDS Data API: one ExecuteStatement, time macros as typed named parameters. A
 * cluster that scaled to zero answers DatabaseResumingException while it wakes, so the query waits
 * and retries for up to 40 seconds.
 */

const SERVICE = 'Aurora';
const RESUME_WAIT_MS = 40_000;

/** The SQL with `:__from` parameters, and those parameters, each once. */
export function auroraParameters(
  sql: string,
  range: ResolvedRange,
): { sql: string; parameters: SqlParameter[] } {
  const { text, used } = expandTimeMacros(sql, (macro) => `:__${macro}`);
  const parameters = [...new Set(used)].map((macro: TimeMacro): SqlParameter =>
    macro.endsWith('Ms')
      ? { name: `__${macro}`, value: { longValue: Number(timeMacroValue(macro, range)) } }
      : {
          name: `__${macro}`,
          typeHint: 'TIMESTAMP',
          value: { stringValue: toSqlTimestamp(macro === 'from' ? range.from : range.to) },
        },
  );
  return { sql: text, parameters };
}

type Spec = z.infer<typeof sqlSpecSchema>;
type MakeClient = (config: RDSDataClientConfig) => Pick<RDSDataClient, 'send'>;

export function createAuroraRuntime(makeClient: MakeClient = (config) => new RDSDataClient(config)) {
  const execute = async (
    { settings, secrets }: { settings: AuroraSettings; secrets: AwsSecrets },
    sql: string,
    parameters: SqlParameter[],
    signal?: AbortSignal,
  ) => {
    const client = makeClient({ region: settings.region, credentials: awsCredentials(secrets) });
    const command = new ExecuteStatementCommand({
      resourceArn: settings.resourceArn,
      secretArn: settings.secretArn,
      database: settings.database,
      sql,
      parameters,
      includeResultMetadata: true,
    });
    const started = Date.now();
    for (;;) {
      try {
        return await client.send(command, { abortSignal: signal });
      } catch (error) {
        const isResuming = (error as { name?: string } | null)?.name === 'DatabaseResumingException';
        if (!isResuming) throw awsError(error, SERVICE);
        if (Date.now() - started > RESUME_WAIT_MS)
          throw new AppError(
            'datasource',
            'The Aurora database is still resuming from a pause. Try again in a moment.',
          );
        await wait(5000, signal);
      }
    }
  };

  const runtime: DatasourceRuntime<AuroraSettings, AwsSecrets> = {
    async query(connection, input, ctx, signal) {
      const spec = input as Spec;
      const { sql, parameters } = auroraParameters(spec.sql, ctx.range);
      const result = await execute(connection, sql, parameters, signal);
      if (!result.columnMetadata?.length) return [];
      return [
        dataApiToFrame(
          result.columnMetadata,
          ((result.records ?? []) as DataApiField[][]).slice(0, spec.maxRows),
        ),
      ];
    },
    async test(connection, signal) {
      await execute(connection, 'SELECT 1', [], signal);
      return `Aurora cluster ${connection.settings.resourceArn.split(':').at(-1) ?? ''} in ${connection.settings.region}`;
    },
  };
  return runtime;
}

export const auroraRuntime = createAuroraRuntime();
