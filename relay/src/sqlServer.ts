import sql from 'mssql';
import type { z } from 'zod';
import { columnsToFrame } from '../../src/core/data/columnsToFrame';
import type { DataFrame, FieldType } from '../../src/core/data/DataFrame';
import { AppError, isAppError, toAppError } from '../../src/core/errors/AppError';
import type { sqlServerQuerySchema, sqlServerTestSchema } from '../../src/core/relay/relayContract';
import type { Driver } from './Driver';
import { checkHosts } from './hosts';
import { createPoolCache } from './poolCache';

/**
 * SQL Server and Azure SQL through `mssql` (tedious). Rows stream in and the query is cancelled at
 * `maxRows`, so a big result never fills the relay's memory. The time range is bound as parameters:
 * `@__from` and `@__to` as `datetime2`, `@__fromMs` and `@__toMs` as `bigint`.
 */

export type SqlServerQuery = z.output<typeof sqlServerQuerySchema>;
export type SqlServerTest = z.output<typeof sqlServerTestSchema>;

/**
 * Sign-ins whose credentials are in the connection string. The others (`azure-active-directory-default`,
 * managed identities) would sign in as the machine the relay runs on.
 */
const AUTHENTICATION_TYPES = new Set([
  'default',
  'ntlm',
  'azure-active-directory-password',
  'azure-active-directory-service-principal-secret',
  'azure-active-directory-access-token',
]);

/** A connection string as mssql's config, once its server is allowed and its sign-in is one the relay supports. */
export function sqlServerConfig(
  connectionString: string,
  { allowedHosts, timeoutMs }: { allowedHosts: readonly string[]; timeoutMs: number },
): sql.config {
  let parsed: ReturnType<typeof sql.ConnectionPool.parseConnectionString>;
  try {
    parsed = sql.ConnectionPool.parseConnectionString(connectionString);
  } catch (error) {
    throw new AppError(
      'validation',
      `That isn't a SQL Server connection string: ${(error as Error).message}`,
      {
        isRetryable: false,
      },
    );
  }
  checkHosts(parsed.server ? [parsed.server] : [], allowedHosts);
  const { authentication_type: authentication = 'default' } = parsed as { authentication_type?: string };
  if (!AUTHENTICATION_TYPES.has(authentication))
    throw new AppError(
      'validation',
      'Sign in with a SQL login, or Microsoft Entra ID with a password, a service principal secret or an access token. The relay doesn’t sign in as the machine it runs on.',
      { isRetryable: false },
    );
  return {
    ...parsed,
    connectionTimeout: Math.min(parsed.connectionTimeout ?? 15_000, timeoutMs),
    requestTimeout: timeoutMs,
    pool: { ...parsed.pool, max: 5, min: 0, idleTimeoutMillis: 60_000 },
    options: { ...parsed.options, appName: 'dashboard-relay' },
  };
}

const NUMBERS = new Set([
  'tinyint',
  'smallint',
  'int',
  'bigint',
  'decimal',
  'numeric',
  'float',
  'real',
  'money',
  'smallmoney',
]);
const TIMES = new Set(['date', 'datetime', 'datetime2', 'smalldatetime', 'datetimeoffset']);

/** A column's SQL Server type as a field type; `time` (of day) and the rest are text. */
export function sqlServerFieldType(declaration = ''): FieldType {
  if (declaration === 'bit') return 'boolean';
  if (NUMBERS.has(declaration)) return 'number';
  if (TIMES.has(declaration)) return 'time';
  return 'string';
}

/** A column as mssql describes it in array row mode: its type is an mssql type with a `declaration`. */
export interface SqlColumn {
  name: string;
  type?: { declaration?: string };
}

/** One result set, as rows of values in column order. */
export interface RowSet {
  columns: SqlColumn[];
  rows: unknown[][];
}

/** What `streamRows` uses of an mssql request in stream mode. */
export interface StreamingRequest {
  on(event: 'recordset', listener: (columns: SqlColumn[]) => void): unknown;
  on(event: 'row', listener: (row: unknown[]) => void): unknown;
  on(event: 'error', listener: (error: Error & { code?: string }) => void): unknown;
  on(event: 'done', listener: () => void): unknown;
  cancel(): unknown;
}

/**
 * Collects a streaming request's result sets, then cancels it once `maxRows` rows have arrived in
 * all, or when `signal` aborts. `start` sends the query once the listeners are in place.
 */
export function streamRows(
  request: StreamingRequest,
  { maxRows, signal, start }: { maxRows: number; signal?: AbortSignal; start: () => void },
): Promise<RowSet[]> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AppError('timeout', 'The query was cancelled.'));
    const sets: RowSet[] = [];
    let count = 0;
    let isCancelled = false;
    let failure: unknown;
    const cancel = () => {
      if (isCancelled) return;
      isCancelled = true;
      request.cancel();
    };
    const handleAbort = () => {
      failure ??= new AppError('timeout', 'The query was cancelled.');
      cancel();
    };
    signal?.addEventListener('abort', handleAbort, { once: true });
    request.on('recordset', (columns) => sets.push({ columns: Object.values(columns), rows: [] }));
    request.on('row', (row) => {
      if (count >= maxRows) return;
      sets.at(-1)?.rows.push(row);
      count += 1;
      if (count >= maxRows) cancel();
    });
    // Cancelling ends the query with an ECANCEL error, which is the point rather than a failure.
    request.on('error', (error) => {
      if (!(isCancelled && error.code === 'ECANCEL')) failure ??= error;
    });
    request.on('done', () => {
      signal?.removeEventListener('abort', handleAbort);
      if (failure === undefined) resolve(sets);
      else reject(failure);
    });
    start();
  });
}

/** A result set as a frame. Binary values become their size, not their bytes. */
export function rowSetToFrame({ columns, rows }: RowSet): DataFrame {
  return columnsToFrame(
    columns.map((column, i) => ({
      name: column.name || `column${i + 1}`,
      type: sqlServerFieldType(column.type?.declaration),
    })),
    rows.map((row) => row.map((value) => (Buffer.isBuffer(value) ? `${value.length} bytes` : value))),
  );
}

/** Permission errors: the login can't read what the query names. */
const DENIED = new Set([229, 230, 262, 297, 300, 916]);

/** A driver error as an `AppError` that says what to fix. */
export function sqlServerError(error: unknown): AppError {
  if (isAppError(error)) return error;
  const { name, code, number, message } = error as {
    name?: string;
    code?: string;
    number?: number;
    message?: string;
  };
  if (name === 'ConnectionError') {
    if (/not currently available|40613/.test(message ?? ''))
      return new AppError(
        'datasource',
        'The database is starting up (free Azure SQL databases pause when idle). Try again in a minute.',
      );
    if (code === 'ELOGIN')
      return new AppError('forbidden', `SQL Server refused the sign-in: ${message}`, { isRetryable: false });
    if (code === 'ETIMEOUT') return new AppError('timeout', `SQL Server didn’t answer in time: ${message}`);
    return new AppError('network', `Could not reach SQL Server: ${message}`);
  }
  if (name === 'RequestError') {
    if (code === 'ETIMEOUT')
      return new AppError('timeout', `The query ran too long and was stopped: ${message}`, {
        isRetryable: false,
      });
    if (number !== undefined && DENIED.has(number))
      return new AppError('forbidden', `SQL Server: ${message}`, { isRetryable: false });
    return new AppError('datasource', `SQL Server: ${message}`, { isRetryable: false });
  }
  return toAppError(error);
}

/** What the driver uses of a connection pool; tests pass a fake. */
export type SqlPool = Pick<sql.ConnectionPool, 'request' | 'close'>;

export function createSqlServerDriver({
  allowedHosts,
  timeoutMs,
  connect = (config) => new sql.ConnectionPool(config).connect(),
}: {
  allowedHosts: readonly string[];
  timeoutMs: number;
  connect?: (config: sql.config) => Promise<SqlPool>;
}): Driver<SqlServerQuery, SqlServerTest> {
  const pools = createPoolCache<SqlPool>({
    open: async (connectionString) => connect(sqlServerConfig(connectionString, { allowedHosts, timeoutMs })),
    close: (pool) => pool.close(),
  });
  const poolFor = (connectionString: string) =>
    pools.get(connectionString).catch((error: unknown) => {
      throw sqlServerError(error);
    });

  return {
    async query({ connectionString, sql: text, range, maxRows }, signal) {
      const pool = await poolFor(connectionString);
      const request = pool.request();
      request.stream = true;
      request.arrayRowMode = true;
      if (range) {
        const from = new Date(range.from);
        const to = new Date(range.to);
        request.input('__from', sql.DateTime2, from);
        request.input('__to', sql.DateTime2, to);
        request.input('__fromMs', sql.BigInt, from.getTime());
        request.input('__toMs', sql.BigInt, to.getTime());
      }
      try {
        const sets = await streamRows(request as unknown as StreamingRequest, {
          maxRows,
          signal,
          // Stream mode reports through the events above; the promise only mirrors them.
          start: () => void request.query(text).catch(() => {}),
        });
        return sets.map(rowSetToFrame);
      } catch (error) {
        throw sqlServerError(error);
      }
    },
    async test({ connectionString }) {
      const pool = await poolFor(connectionString);
      try {
        const { recordset } = await pool
          .request()
          .query<{ version: string; database: string }>(
            'SELECT @@VERSION AS version, DB_NAME() AS [database]',
          );
        const [row] = recordset;
        const version = row?.version.split('\n')[0]?.replace(/\s+/g, ' ').trim() ?? 'SQL Server';
        return `${version}, database ${row?.database ?? '?'}`;
      } catch (error) {
        throw sqlServerError(error);
      }
    },
    close: () => pools.closeAll(),
  };
}
