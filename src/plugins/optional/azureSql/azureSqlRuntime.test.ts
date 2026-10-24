import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import type { QueryContext } from '@/plugins/DatasourcePlugin';
import { azureSqlSecretsSchema } from './azureSqlPlugin';
import { azureSqlRuntime } from './azureSqlRuntime';

const range = { from: new Date('2026-10-24T00:00:00Z'), to: new Date('2026-10-25T00:00:00Z') };
const ctx = { range } as QueryContext;
const CONNECTION_STRING =
  'Server=tcp:shop.database.windows.net,1433;Initial Catalog=shop;User ID=reader;Password=p;';
const connection = {
  settings: { relayUrl: 'https://relay.example.com' },
  secrets: { relayToken: 'relay-token', connectionString: CONNECTION_STRING },
};

afterEach(() => vi.unstubAllGlobals());

describe('azureSqlSecretsSchema', () => {
  it('wants an ADO.NET connection string', () => {
    expect(azureSqlSecretsSchema.safeParse({ connectionString: CONNECTION_STRING }).success).toBe(true);
    expect(azureSqlSecretsSchema.safeParse({ connectionString: 'shop.database.windows.net' }).success).toBe(
      false,
    );
  });
});

describe('azureSqlRuntime', () => {
  it('sends the query with its macros as the relay’s parameters, and the range to bind', async () => {
    const fetch = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response('{"frames":[{"fields":[{"name":"orders","type":"number","values":[42]}]}]}'),
    );
    vi.stubGlobal('fetch', fetch);
    const frames = await azureSqlRuntime.query(
      connection,
      {
        sql: 'SELECT COUNT(*) AS orders FROM orders WHERE created_at BETWEEN $__from AND $__to AND ms < $__toMs',
        maxRows: 100,
      },
      ctx,
    );
    expect(frames[0]).toMatchObject({ length: 1, fields: [{ name: 'orders', values: [42] }] });
    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('https://relay.example.com/v1/sqlserver/query');
    expect(JSON.parse(init.body as string)).toEqual({
      connectionString: CONNECTION_STRING,
      sql: 'SELECT COUNT(*) AS orders FROM orders WHERE created_at BETWEEN @__from AND @__to AND ms < @__toMs',
      range: { from: '2026-10-24T00:00:00.000Z', to: '2026-10-25T00:00:00.000Z' },
      maxRows: 100,
    });
  });

  it('tests the connection with what the server says it is', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"ok":true,"server":"Microsoft SQL Azure, database shop"}')),
    );
    await expect(azureSqlRuntime.test(connection)).resolves.toBe('Microsoft SQL Azure, database shop');
  });
});
