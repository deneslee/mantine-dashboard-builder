import {
  AthenaClient,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
  StartQueryExecutionCommand,
  StopQueryExecutionCommand,
  type AthenaClientConfig,
  type ColumnInfo,
  type Row,
} from '@aws-sdk/client-athena';
import type { z } from 'zod';
import { columnsToFrame } from '@/core/data/columnsToFrame';
import type { DataFrame, FieldType } from '@/core/data/DataFrame';
import { expandTimeMacros, timeMacroValue } from '@/core/data/timeMacros';
import { AppError } from '@/core/errors/AppError';
import type { ResolvedRange } from '@/core/time/timeRange';
import type { DatasourceRuntime } from '@/plugins/OptionalPlugin';
import { wait } from '@/utils/wait';
import { awsCredentials, awsError } from './awsErrors';
import type { AthenaSettings, AwsSecrets, sqlSpecSchema } from './awsPlugin';

/**
 * Athena: start the query, poll until it finishes, then read the result pages up to `maxRows`.
 * Athena has no named parameters, so time macros become timestamp literals built from the range
 * (our values, never user text). An aborted query is stopped, so it stops scanning (and billing).
 */

const SERVICE = 'Athena';
const MAX_WAIT_MS = 120_000;
const PAGE = 1000;

const NUMBERS = new Set([
  'tinyint',
  'smallint',
  'integer',
  'int',
  'bigint',
  'double',
  'float',
  'real',
  'decimal',
]);

function athenaFieldType(type = ''): FieldType {
  const base = type.toLowerCase();
  if (base === 'boolean') return 'boolean';
  if (NUMBERS.has(base)) return 'number';
  if (base === 'date' || base.startsWith('timestamp')) return 'time';
  return 'string';
}

/** Athena prints `timestamp with time zone` as `2026-10-24 09:30:00.000 UTC`. */
const athenaValue = (value: string | undefined) => value?.replace(/ UTC$/, 'Z') ?? null;

/** Athena's rows (strings, the first a header on the first page) as a DataFrame. */
export function athenaToFrame(columns: ColumnInfo[], rows: Row[]): DataFrame {
  return columnsToFrame(
    columns.map((column, i) => ({
      name: column.Label || column.Name || `column${i + 1}`,
      type: athenaFieldType(column.Type),
    })),
    rows.map((row) => (row.Data ?? []).map((datum) => athenaValue(datum.VarCharValue))),
  );
}

/** The query with time macros as literals: `from_iso8601_timestamp('…')`, or epoch milliseconds. */
export const athenaQuery = (sql: string, range: ResolvedRange) =>
  expandTimeMacros(sql, (macro) =>
    macro.endsWith('Ms')
      ? String(timeMacroValue(macro, range))
      : `from_iso8601_timestamp('${timeMacroValue(macro, range)}')`,
  ).text;

type Spec = z.infer<typeof sqlSpecSchema>;
type MakeClient = (config: AthenaClientConfig) => Pick<AthenaClient, 'send'>;

export function createAthenaRuntime(makeClient: MakeClient = (config) => new AthenaClient(config)) {
  const clientFor = (settings: AthenaSettings, secrets: AwsSecrets) =>
    makeClient({ region: settings.region, credentials: awsCredentials(secrets) });

  const start = async (
    client: Pick<AthenaClient, 'send'>,
    settings: AthenaSettings,
    sql: string,
    signal?: AbortSignal,
  ) => {
    const { QueryExecutionId: id } = await client.send(
      new StartQueryExecutionCommand({
        QueryString: sql,
        WorkGroup: settings.workgroup,
        QueryExecutionContext: { Catalog: settings.catalog, Database: settings.database },
        ...(settings.outputLocation
          ? { ResultConfiguration: { OutputLocation: settings.outputLocation } }
          : {}),
      }),
      { abortSignal: signal },
    );
    if (!id) throw new AppError('datasource', 'Athena started no query.');
    return id;
  };

  /** Polls until the query finishes; stops it on abort or after two minutes. */
  const finish = async (client: Pick<AthenaClient, 'send'>, id: string, signal?: AbortSignal) => {
    const stop = () =>
      void client.send(new StopQueryExecutionCommand({ QueryExecutionId: id })).catch(() => {});
    signal?.addEventListener('abort', stop, { once: true });
    try {
      const started = Date.now();
      for (let delay = 250; ; delay = Math.min(delay * 1.5, 2000)) {
        const { QueryExecution } = await client.send(new GetQueryExecutionCommand({ QueryExecutionId: id }), {
          abortSignal: signal,
        });
        const state = QueryExecution?.Status?.State;
        if (state === 'SUCCEEDED') return;
        if (state === 'FAILED' || state === 'CANCELLED')
          throw new AppError(
            'datasource',
            `Athena: ${QueryExecution?.Status?.StateChangeReason ?? `the query was ${state?.toLowerCase()}.`}`,
            {
              isRetryable: false,
            },
          );
        if (Date.now() - started > MAX_WAIT_MS) {
          stop();
          throw new AppError('timeout', 'The Athena query ran for over 2 minutes and was stopped.');
        }
        await wait(delay, signal);
      }
    } finally {
      signal?.removeEventListener('abort', stop);
    }
  };

  const runtime: DatasourceRuntime<AthenaSettings, AwsSecrets> = {
    async query({ settings, secrets }, input, ctx, signal) {
      const spec = input as Spec;
      const client = clientFor(settings, secrets);
      try {
        const id = await start(client, settings, athenaQuery(spec.sql, ctx.range), signal);
        await finish(client, id, signal);
        let columns: ColumnInfo[] = [];
        const rows: Row[] = [];
        let token: string | undefined;
        let isFirst = true;
        do {
          const page = await client.send(
            new GetQueryResultsCommand({ QueryExecutionId: id, NextToken: token, MaxResults: PAGE }),
            { abortSignal: signal },
          );
          columns = page.ResultSet?.ResultSetMetadata?.ColumnInfo ?? columns;
          // A SELECT's first row repeats the column names.
          rows.push(...(page.ResultSet?.Rows ?? []).slice(isFirst ? 1 : 0));
          isFirst = false;
          token = page.NextToken;
        } while (token && rows.length < spec.maxRows);
        return columns.length ? [athenaToFrame(columns, rows.slice(0, spec.maxRows))] : [];
      } catch (error) {
        throw awsError(error, SERVICE);
      }
    },

    async test({ settings, secrets }, signal) {
      const client = clientFor(settings, secrets);
      try {
        const id = await start(client, settings, 'SELECT 1', signal);
        await finish(client, id, signal);
      } catch (error) {
        throw awsError(error, SERVICE);
      }
      return `Athena workgroup ${settings.workgroup} in ${settings.region}`;
    },
  };
  return runtime;
}

export const athenaRuntime = createAthenaRuntime();
