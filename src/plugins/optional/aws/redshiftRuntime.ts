import {
  CancelStatementCommand,
  DescribeStatementCommand,
  ExecuteStatementCommand,
  GetStatementResultCommand,
  RedshiftDataClient,
  type ColumnMetadata,
  type RedshiftDataClientConfig,
  type SqlParameter,
} from '@aws-sdk/client-redshift-data';
import type { z } from 'zod';
import { expandTimeMacros, timeMacroValue, toSqlTimestamp, type TimeMacro } from '@/core/data/timeMacros';
import { AppError } from '@/core/errors/AppError';
import type { ResolvedRange } from '@/core/time/timeRange';
import type { DatasourceRuntime } from '@/plugins/OptionalPlugin';
import { wait } from '@/utils/wait';
import { awsCredentials, awsError } from './awsErrors';
import type { AwsSecrets, RedshiftSettings, sqlSpecSchema } from './awsPlugin';
import { dataApiToFrame, type DataApiField } from './dataApiFrame';

/**
 * Redshift through the Redshift Data API: execute, poll until it finishes, then read the result
 * pages. Parameters are strings, so time macros become `CAST(:__from AS TIMESTAMP)`.
 */

const SERVICE = 'Redshift';
const MAX_WAIT_MS = 120_000;

/** The SQL with cast named parameters, and those parameters, each once. */
export function redshiftParameters(
  sql: string,
  range: ResolvedRange,
): { sql: string; parameters: SqlParameter[] } {
  const { text, used } = expandTimeMacros(sql, (macro) =>
    macro.endsWith('Ms') ? `CAST(:__${macro} AS BIGINT)` : `CAST(:__${macro} AS TIMESTAMP)`,
  );
  const parameters = [...new Set(used)].map((macro: TimeMacro) => ({
    name: `__${macro}`,
    value: macro.endsWith('Ms')
      ? String(timeMacroValue(macro, range))
      : toSqlTimestamp(macro === 'from' ? range.from : range.to),
  }));
  return { sql: text, parameters };
}

type Spec = z.infer<typeof sqlSpecSchema>;
type MakeClient = (config: RedshiftDataClientConfig) => Pick<RedshiftDataClient, 'send'>;

export function createRedshiftRuntime(makeClient: MakeClient = (config) => new RedshiftDataClient(config)) {
  /** Runs a statement to the end; its id and whether it has rows. */
  const run = async (
    client: Pick<RedshiftDataClient, 'send'>,
    settings: RedshiftSettings,
    sql: string,
    parameters: SqlParameter[],
    signal?: AbortSignal,
  ) => {
    const { Id: id } = await client.send(
      new ExecuteStatementCommand({
        Sql: sql,
        Database: settings.database,
        WorkgroupName: settings.workgroupName,
        ClusterIdentifier: settings.clusterIdentifier,
        DbUser: settings.dbUser,
        SecretArn: settings.secretArn,
        ...(parameters.length ? { Parameters: parameters } : {}),
      }),
      { abortSignal: signal },
    );
    if (!id) throw new AppError('datasource', 'Redshift started no statement.');
    const cancel = () => void client.send(new CancelStatementCommand({ Id: id })).catch(() => {});
    signal?.addEventListener('abort', cancel, { once: true });
    try {
      const started = Date.now();
      for (let delay = 250; ; delay = Math.min(delay * 1.5, 2000)) {
        const statement = await client.send(new DescribeStatementCommand({ Id: id }), {
          abortSignal: signal,
        });
        if (statement.Status === 'FINISHED') return { id, hasRows: Boolean(statement.HasResultSet) };
        if (statement.Status === 'FAILED' || statement.Status === 'ABORTED')
          throw new AppError(
            'datasource',
            `Redshift: ${statement.Error ?? `the statement was ${statement.Status.toLowerCase()}.`}`,
            {
              isRetryable: false,
            },
          );
        if (Date.now() - started > MAX_WAIT_MS) {
          cancel();
          throw new AppError('timeout', 'The Redshift query ran for over 2 minutes and was cancelled.');
        }
        await wait(delay, signal);
      }
    } finally {
      signal?.removeEventListener('abort', cancel);
    }
  };

  const clientFor = (settings: RedshiftSettings, secrets: AwsSecrets) =>
    makeClient({ region: settings.region, credentials: awsCredentials(secrets) });

  const runtime: DatasourceRuntime<RedshiftSettings, AwsSecrets> = {
    async query({ settings, secrets }, input, ctx, signal) {
      const spec = input as Spec;
      const client = clientFor(settings, secrets);
      try {
        const { sql, parameters } = redshiftParameters(spec.sql, ctx.range);
        const { id, hasRows } = await run(client, settings, sql, parameters, signal);
        if (!hasRows) return [];
        let columns: ColumnMetadata[] = [];
        const records: DataApiField[][] = [];
        let token: string | undefined;
        do {
          const page = await client.send(new GetStatementResultCommand({ Id: id, NextToken: token }), {
            abortSignal: signal,
          });
          columns = page.ColumnMetadata ?? columns;
          records.push(...((page.Records ?? []) as DataApiField[][]));
          token = page.NextToken;
        } while (token && records.length < spec.maxRows);
        return [dataApiToFrame(columns, records.slice(0, spec.maxRows))];
      } catch (error) {
        throw awsError(error, SERVICE);
      }
    },
    async test({ settings, secrets }, signal) {
      try {
        await run(clientFor(settings, secrets), settings, 'SELECT 1', [], signal);
      } catch (error) {
        throw awsError(error, SERVICE);
      }
      return `Redshift ${settings.workgroupName ? `workgroup ${settings.workgroupName}` : `cluster ${settings.clusterIdentifier ?? ''}`}, database ${settings.database}`;
    },
  };
  return runtime;
}

export const redshiftRuntime = createRedshiftRuntime();
