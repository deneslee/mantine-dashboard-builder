import { columnsToFrame, type Column } from '@/core/data/columnsToFrame';
import type { DataFrame, FieldType } from '@/core/data/DataFrame';
import { expandTimeMacros, timeMacroValue, type TimeMacro } from '@/core/data/timeMacros';
import { AppError } from '@/core/errors/AppError';
import type { DatasourceRuntime } from '@/plugins/OptionalPlugin';
import type { ResolvedRange } from '@/core/time/timeRange';
import { googleFetch } from './googleApi';
import { SCOPES, getAccessToken } from './googleAuth';
import type { BigQuerySettings, GoogleSecrets, bigquerySpecSchema } from './googlePlugin';
import type { z } from 'zod';

/**
 * BigQuery over its REST API: `jobs.query`, then `getQueryResults` until the job is done and every
 * page (up to `maxRows`) is read. Time macros become named parameters.
 */

const API = 'https://bigquery.googleapis.com/bigquery/v2';
const SERVICE = 'BigQuery';
const WAIT_MS = 10_000;
/** How long a query may run before the widget gives up (the job is cancelled). */
const MAX_WAIT_MS = 120_000;

interface SchemaField {
  name: string;
  type: string;
  mode?: string;
}

interface QueryResponse {
  jobComplete: boolean;
  jobReference?: { projectId: string; jobId: string; location?: string };
  schema?: { fields: SchemaField[] };
  rows?: { f: { v: unknown }[] }[];
  pageToken?: string;
  totalBytesProcessed?: string;
}

const NUMBER_TYPES = new Set(['INTEGER', 'INT64', 'FLOAT', 'FLOAT64', 'NUMERIC', 'BIGNUMERIC']);
const TIME_TYPES = new Set(['TIMESTAMP', 'DATE', 'DATETIME']);

function fieldType(field: SchemaField): FieldType {
  if (field.mode === 'REPEATED') return 'string';
  if (NUMBER_TYPES.has(field.type)) return 'number';
  if (field.type === 'BOOLEAN' || field.type === 'BOOL') return 'boolean';
  if (TIME_TYPES.has(field.type)) return 'time';
  return 'string';
}

/** A cell as the frame wants it: TIMESTAMPs arrive as epoch microseconds (`useInt64Timestamp`). */
function cellValue(field: SchemaField, value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (field.mode === 'REPEATED' || field.type === 'RECORD' || field.type === 'STRUCT')
    return JSON.stringify(value);
  if (field.type === 'TIMESTAMP') return Number(value) / 1000;
  return value;
}

/** BigQuery's rows (`{ f: [{ v }] }`) as a DataFrame typed from the schema. */
export function bigqueryToFrame(fields: SchemaField[], rows: QueryResponse['rows'] = []): DataFrame {
  const columns: Column[] = fields.map((field) => ({ name: field.name, type: fieldType(field) }));
  return columnsToFrame(
    columns,
    rows.map((row) => fields.map((field, i) => cellValue(field, row.f[i]?.v))),
  );
}

/** The query text with `$__from` and friends as `@__from` parameters, and those parameters. */
export function bigqueryParameters(sql: string, range: ResolvedRange) {
  const { text, used } = expandTimeMacros(sql, (macro) => `@__${macro}`);
  const parameters = [...new Set(used)].map((macro: TimeMacro) => ({
    name: `__${macro}`,
    parameterType: { type: macro.endsWith('Ms') ? 'INT64' : 'TIMESTAMP' },
    parameterValue: { value: String(timeMacroValue(macro, range)) },
  }));
  return { query: text, parameters };
}

type Settings = BigQuerySettings;
type Spec = z.infer<typeof bigquerySpecSchema>;

const resultsUrl = (
  job: NonNullable<QueryResponse['jobReference']>,
  maxResults: number,
  pageToken?: string,
) => {
  const params = new URLSearchParams({
    timeoutMs: String(WAIT_MS),
    maxResults: String(maxResults),
    'formatOptions.useInt64Timestamp': 'true',
    ...(job.location ? { location: job.location } : {}),
    ...(pageToken ? { pageToken } : {}),
  });
  return `${API}/projects/${encodeURIComponent(job.projectId)}/queries/${encodeURIComponent(job.jobId)}?${params}`;
};

function cancel(job: QueryResponse['jobReference'], token: string) {
  if (!job) return;
  const location = job.location ? `?location=${encodeURIComponent(job.location)}` : '';
  void fetch(
    `${API}/projects/${encodeURIComponent(job.projectId)}/jobs/${encodeURIComponent(job.jobId)}/cancel${location}`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
    },
  ).catch(() => {});
}

export const bigqueryRuntime: DatasourceRuntime<Settings, GoogleSecrets> = {
  async query({ settings, secrets }, input, ctx, signal) {
    const spec = input as Spec;
    const token = await getAccessToken(secrets, SCOPES.bigquery, { signal });
    const { query, parameters } = bigqueryParameters(spec.sql, ctx.range);
    let response = await googleFetch<QueryResponse>(
      `${API}/projects/${encodeURIComponent(settings.projectId)}/queries`,
      {
        token,
        signal,
        service: SERVICE,
        body: {
          query,
          useLegacySql: false,
          parameterMode: 'NAMED',
          queryParameters: parameters,
          maxResults: Math.min(spec.maxRows, 10_000),
          timeoutMs: WAIT_MS,
          formatOptions: { useInt64Timestamp: true },
          ...(settings.location ? { location: settings.location } : {}),
          ...(settings.maximumBytesBilled ? { maximumBytesBilled: String(settings.maximumBytesBilled) } : {}),
        },
      },
    );
    const job = response.jobReference;
    const handleAbort = () => cancel(job, token);
    signal?.addEventListener('abort', handleAbort, { once: true });
    try {
      const started = Date.now();
      while (!response.jobComplete) {
        if (!job) throw new AppError('datasource', 'BigQuery returned no job to wait for.');
        if (Date.now() - started > MAX_WAIT_MS) {
          cancel(job, token);
          throw new AppError('timeout', 'The BigQuery query ran for over 2 minutes and was cancelled.');
        }
        response = await googleFetch<QueryResponse>(resultsUrl(job, Math.min(spec.maxRows, 10_000)), {
          token,
          signal,
          service: SERVICE,
        });
      }
      const fields = response.schema?.fields ?? [];
      const rows = [...(response.rows ?? [])];
      let pageToken = response.pageToken;
      while (pageToken && job && rows.length < spec.maxRows) {
        const page = await googleFetch<QueryResponse>(
          resultsUrl(job, Math.min(spec.maxRows - rows.length, 10_000), pageToken),
          { token, signal, service: SERVICE },
        );
        rows.push(...(page.rows ?? []));
        pageToken = page.pageToken;
      }
      return fields.length ? [bigqueryToFrame(fields, rows.slice(0, spec.maxRows))] : [];
    } finally {
      signal?.removeEventListener('abort', handleAbort);
    }
  },

  async test({ settings, secrets }, signal) {
    const token = await getAccessToken(secrets, SCOPES.bigquery, { signal });
    // A dry run checks the credentials and the right to run jobs, and scans nothing.
    await googleFetch(`${API}/projects/${encodeURIComponent(settings.projectId)}/queries`, {
      token,
      signal,
      service: SERVICE,
      body: {
        query: 'SELECT 1',
        useLegacySql: false,
        dryRun: true,
        ...(settings.location ? { location: settings.location } : {}),
      },
    });
    return `BigQuery in project ${settings.projectId}`;
  },
};
