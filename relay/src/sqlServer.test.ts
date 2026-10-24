import { EventEmitter } from 'node:events';
import sql from 'mssql';
import { describe, expect, it, vi } from 'vite-plus/test';
import {
  createSqlServerDriver,
  rowSetToFrame,
  sqlServerConfig,
  sqlServerError,
  sqlServerFieldType,
  streamRows,
  type SqlColumn,
  type SqlPool,
} from './sqlServer';

const OPTIONS = { allowedHosts: ['*.database.windows.net'], timeoutMs: 30_000 };
const CONNECTION_STRING =
  'Server=tcp:shop.database.windows.net,1433;Initial Catalog=shop;User ID=reader;Password=secret;Encrypt=True;Connection Timeout=60;';

/** A streaming mssql request: cancelling ends it with ECANCEL, as tedious does. */
class FakeRequest extends EventEmitter {
  stream = false;
  arrayRowMode = false;
  input = vi.fn();
  cancel = vi.fn(() => {
    setImmediate(() => {
      this.emit('error', new sql.RequestError('Canceled.', 'ECANCEL'));
      this.emit('done');
    });
  });
  query = vi.fn(async (_text: string) => {});
}

const columns = (...types: [string, string][]): SqlColumn[] =>
  types.map(([name, declaration]) => ({ name, type: { declaration } }));

describe('sqlServerConfig', () => {
  it('reads an Azure SQL connection string and adds the relay’s limits', () => {
    expect(sqlServerConfig(CONNECTION_STRING, OPTIONS)).toMatchObject({
      server: 'shop.database.windows.net',
      port: 1433,
      database: 'shop',
      user: 'reader',
      password: 'secret',
      connectionTimeout: 30_000,
      requestTimeout: 30_000,
      pool: { max: 5, min: 0 },
      options: { encrypt: true, appName: 'dashboard-relay' },
    });
  });

  it('refuses servers off the allowlist, strings without one, and signing in as the relay’s machine', () => {
    expect(() => sqlServerConfig('Server=10.0.0.5;User ID=a;Password=b', OPTIONS)).toThrow(
      expect.objectContaining({ code: 'forbidden' }),
    );
    expect(() => sqlServerConfig('User ID=a;Password=b', OPTIONS)).toThrow(/names no server/);
    expect(() =>
      sqlServerConfig('Server=shop.database.windows.net;Authentication=Active Directory Integrated', OPTIONS),
    ).toThrow(/doesn’t sign in as the machine/);
  });
});

describe('sqlServerFieldType', () => {
  it('reads numbers, bits and dates; times of day and the rest are text', () => {
    expect(
      [
        'int',
        'bigint',
        'decimal',
        'money',
        'bit',
        'datetime2',
        'datetimeoffset',
        'date',
        'time',
        'nvarchar',
        'uniqueidentifier',
      ].map((declaration) => sqlServerFieldType(declaration)),
    ).toEqual([
      'number',
      'number',
      'number',
      'number',
      'boolean',
      'time',
      'time',
      'time',
      'string',
      'string',
      'string',
    ]);
  });
});

describe('streamRows', () => {
  it('collects each result set, typed by its columns', async () => {
    const request = new FakeRequest();
    const sets = await streamRows(request, {
      maxRows: 10,
      start: () => {
        request.emit('recordset', columns(['day', 'date'], ['orders', 'bigint'], ['logo', 'varbinary']));
        request.emit('row', [new Date('2026-10-24T00:00:00Z'), '42', Buffer.from('png')]);
        request.emit('recordset', columns(['', 'bit']));
        request.emit('row', [true]);
        request.emit('done');
      },
    });
    expect(
      sets
        .map(rowSetToFrame)
        .map((frame) => frame.fields.map(({ name, type, values }) => [name, type, values])),
    ).toEqual([
      [
        ['day', 'time', [Date.parse('2026-10-24T00:00:00Z')]],
        ['orders', 'number', [42]],
        ['logo', 'string', ['3 bytes']],
      ],
      [['column1', 'boolean', [true]]],
    ]);
  });

  it('cancels the query at maxRows across result sets, which isn’t a failure', async () => {
    const request = new FakeRequest();
    const sets = await streamRows(request, {
      maxRows: 2,
      start: () => {
        request.emit('recordset', columns(['n', 'int']));
        for (const n of [1, 2, 3]) request.emit('row', [n]);
      },
    });
    expect(request.cancel).toHaveBeenCalledTimes(1);
    expect(sets[0]?.rows).toEqual([[1], [2]]);
  });

  it('fails with the first error', async () => {
    const request = new FakeRequest();
    const error = new sql.RequestError("Invalid object name 'orders'.", 'EREQUEST');
    await expect(
      streamRows(request, {
        maxRows: 10,
        start: () => {
          request.emit('error', error);
          request.emit('error', new sql.RequestError('Statement(s) could not be prepared.', 'EREQUEST'));
          request.emit('done');
        },
      }),
    ).rejects.toBe(error);
  });

  it('cancels the query when nobody waits for it any more', async () => {
    const request = new FakeRequest();
    const controller = new AbortController();
    const rows = streamRows(request, { maxRows: 10, signal: controller.signal, start: () => {} });
    controller.abort();
    await expect(rows).rejects.toMatchObject({ code: 'timeout' });
    expect(request.cancel).toHaveBeenCalled();
  });
});

describe('sqlServerError', () => {
  it('says what to fix for each kind of failure', () => {
    const cases: [Error, string, boolean][] = [
      [new sql.ConnectionError("Login failed for user 'reader'.", 'ELOGIN'), 'forbidden', false],
      [
        new sql.ConnectionError("Database 'shop' on server 'shop' is not currently available.", 'ELOGIN'),
        'datasource',
        true,
      ],
      [new sql.ConnectionError('Failed to connect in 15000ms', 'ETIMEOUT'), 'timeout', true],
      [new sql.ConnectionError('Failed to connect to shop:1433', 'ESOCKET'), 'network', true],
      [new sql.RequestError('Timeout: Request failed to complete in 30000ms', 'ETIMEOUT'), 'timeout', false],
      [
        Object.assign(
          new sql.RequestError("The SELECT permission was denied on the object 'orders'.", 'EREQUEST'),
          {
            number: 229,
          },
        ),
        'forbidden',
        false,
      ],
      [new sql.RequestError("Incorrect syntax near 'FORM'.", 'EREQUEST'), 'datasource', false],
    ];
    for (const [error, code, isRetryable] of cases)
      expect(sqlServerError(error), error.message).toMatchObject({ code, isRetryable });
  });
});

describe('createSqlServerDriver', () => {
  /** A pool whose queries answer with `rows` of one int column. */
  function fakePool(rows: unknown[][]) {
    const request = new FakeRequest();
    request.query.mockImplementation(async () => {
      request.emit('recordset', columns(['orders', 'int']));
      for (const row of rows) request.emit('row', row);
      request.emit('done');
    });
    const pool = { request: () => request, close: vi.fn(async () => {}) } as unknown as SqlPool;
    return { request, pool };
  }

  it('connects once per connection string, binds the time range and streams the rows', async () => {
    const { request, pool } = fakePool([[1], [2]]);
    const connect = vi.fn(async (_config: sql.config) => pool);
    const driver = createSqlServerDriver({ ...OPTIONS, connect });
    const range = { from: '2026-10-24T00:00:00.000Z', to: '2026-10-25T00:00:00.000Z' };
    const query = {
      connectionString: CONNECTION_STRING,
      sql: 'SELECT 1 WHERE @__from < @__to',
      range,
      maxRows: 10,
    };
    const [frame] = await driver.query(query);
    await driver.query(query);
    expect(frame?.fields[0]?.values).toEqual([1, 2]);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(connect.mock.calls[0]?.[0]).toMatchObject({ server: 'shop.database.windows.net' });
    expect(request).toMatchObject({ stream: true, arrayRowMode: true });
    expect(request.input).toHaveBeenCalledWith('__from', sql.DateTime2, new Date(range.from));
    expect(request.input).toHaveBeenCalledWith('__toMs', sql.BigInt, Date.parse(range.to));
    expect(request.query).toHaveBeenCalledWith('SELECT 1 WHERE @__from < @__to');
  });

  it('reports a failed sign-in as forbidden, and tries again next time', async () => {
    const connect = vi
      .fn<(config: sql.config) => Promise<SqlPool>>()
      .mockRejectedValueOnce(new sql.ConnectionError("Login failed for user 'reader'.", 'ELOGIN'))
      .mockResolvedValue(fakePool([]).pool);
    const driver = createSqlServerDriver({ ...OPTIONS, connect });
    const query = { connectionString: CONNECTION_STRING, sql: 'SELECT 1', maxRows: 10 };
    await expect(driver.query(query)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(driver.query(query)).resolves.toHaveLength(1);
  });

  it('tests a connection with the server’s version and database', async () => {
    const pool = {
      request: () => ({
        query: async () => ({
          recordset: [
            { version: 'Microsoft SQL Azure (RTM) - 12.0.2000.8 \n\tOct  2 2025 11:10:12', database: 'shop' },
          ],
        }),
      }),
      close: async () => {},
    } as unknown as SqlPool;
    const driver = createSqlServerDriver({ ...OPTIONS, connect: async () => pool });
    await expect(driver.test({ connectionString: CONNECTION_STRING })).resolves.toBe(
      'Microsoft SQL Azure (RTM) - 12.0.2000.8, database shop',
    );
  });
});
