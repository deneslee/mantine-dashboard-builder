import { describe, expect, it, vi } from 'vite-plus/test';
import type { DataFrame } from '../../src/core/data/DataFrame';
import { AppError } from '../../src/core/errors/AppError';
import { relayErrorSchema, relayFramesSchema } from '../../src/core/relay/relayContract';
import { createRelay, type Drivers } from './app';
import { readEnv } from './env';

const ORIGIN = 'http://localhost:5173';
const TOKEN = 't'.repeat(32);
const CONNECTION_STRING = 'Server=tcp:shop.database.windows.net,1433;User ID=reader;Password=hunter22secret;';
const FRAME: DataFrame = { length: 1, fields: [{ name: 'orders', type: 'number', values: [42] }] };

function setup(env: Record<string, string> = {}) {
  const drivers = {
    sqlServer: {
      query: vi.fn(async () => [FRAME]),
      test: vi.fn(async () => 'Microsoft SQL Azure (RTM) - 12.0.2000.8, database shop'),
      close: vi.fn(async () => {}),
    },
    mongo: {
      query: vi.fn(async () => [FRAME]),
      test: vi.fn(async () => 'MongoDB 8.0.4'),
      close: vi.fn(async () => {}),
    },
  } satisfies Drivers;
  const lines: string[] = [];
  const app = createRelay({ env: readEnv(env), drivers, log: (line) => lines.push(line) });
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    app.request(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: ORIGIN, ...headers },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  return { app, drivers, lines, post };
}

describe('relay', () => {
  it('runs a SQL Server query, capping its rows at the relay’s limit', async () => {
    const { drivers, post } = setup({ RELAY_MAX_ROWS: '100' });
    const res = await post('/v1/sqlserver/query', {
      connectionString: CONNECTION_STRING,
      sql: 'SELECT 42 AS orders',
      range: { from: '2026-10-24T00:00:00.000Z', to: '2026-10-25T00:00:00.000Z' },
      maxRows: 5000,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect(relayFramesSchema.parse(await res.json()).frames[0]?.fields[0]?.values).toEqual([42]);
    expect(drivers.sqlServer.query).toHaveBeenCalledWith(
      expect.objectContaining({ maxRows: 100 }),
      expect.any(AbortSignal),
    );
  });

  it('tests MongoDB connections', async () => {
    const { post } = setup();
    const res = await post('/v1/mongodb/test', {
      connectionString: 'mongodb+srv://r:p@cluster0.abc.mongodb.net/',
    });
    expect(await res.json()).toEqual({ ok: true, server: 'MongoDB 8.0.4' });
  });

  it('answers preflights from allowed origins, including Chrome’s private network check', async () => {
    const { app } = setup();
    const res = await app.request('/v1/mongodb/query', {
      method: 'OPTIONS',
      headers: {
        origin: ORIGIN,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'authorization,content-type',
        'access-control-request-private-network': 'true',
      },
    });
    expect(res.status).toBe(204);
    expect(Object.fromEntries(res.headers)).toMatchObject({
      'access-control-allow-origin': ORIGIN,
      'access-control-allow-methods': 'GET,POST',
      'access-control-allow-headers': 'authorization,content-type',
      'access-control-allow-private-network': 'true',
    });
  });

  it('refuses pages from other origins, preflights included', async () => {
    const { app, drivers, post } = setup();
    const res = await post(
      '/v1/sqlserver/query',
      { connectionString: CONNECTION_STRING, sql: 'SELECT 1' },
      {
        origin: 'https://evil.example',
      },
    );
    expect(res.status).toBe(403);
    expect(
      (
        await app.request('/v1/sqlserver/query', {
          method: 'OPTIONS',
          headers: { origin: 'https://evil.example' },
        })
      ).status,
    ).toBe(403);
    expect(drivers.sqlServer.query).not.toHaveBeenCalled();
  });

  it('without a token, answers only on localhost, so DNS rebinding gets nowhere', async () => {
    const { app } = setup();
    expect((await app.request('http://127.0.0.1:8787/v1/health')).status).toBe(200);
    expect((await app.request('http://rebind.evil.example:8787/v1/health')).status).toBe(403);
  });

  it('with a token, needs it on every query but not the health check', async () => {
    const { app, post } = setup({ RELAY_HOST: '0.0.0.0', RELAY_TOKEN: TOKEN });
    const body = { connectionString: CONNECTION_STRING, sql: 'SELECT 1' };
    expect((await post('/v1/sqlserver/query', body)).status).toBe(401);
    expect(
      (await post('/v1/sqlserver/query', body, { authorization: `Bearer ${'x'.repeat(32)}` })).status,
    ).toBe(401);
    expect((await post('/v1/sqlserver/query', body, { authorization: `Bearer ${TOKEN}` })).status).toBe(200);
    expect((await app.request('http://relay.example.com/v1/health')).status).toBe(200);
  });

  it('refuses bodies that are too big, not JSON or not a query', async () => {
    const { post } = setup();
    const big = await post('/v1/sqlserver/query', {
      connectionString: CONNECTION_STRING,
      sql: 'x'.repeat(300_000),
    });
    expect(big.status).toBe(413);
    const notJson = await post('/v1/sqlserver/query', 'SELECT 1');
    expect(notJson.status).toBe(400);
    const missing = await post('/v1/mongodb/query', {
      connectionString: 'mongodb://localhost',
      database: 'shop',
    });
    expect(missing.status).toBe(400);
    expect(relayErrorSchema.parse(await missing.json()).error.message).toMatch(/^collection: /);
  });

  it('returns driver errors with their status, never the connection string or its password', async () => {
    const { drivers, lines, post } = setup();
    drivers.sqlServer.query.mockRejectedValueOnce(
      new AppError('forbidden', `Login failed for ${CONNECTION_STRING} (hunter22secret)`, {
        isRetryable: false,
      }),
    );
    const res = await post('/v1/sqlserver/query', { connectionString: CONNECTION_STRING, sql: 'SELECT 1' });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: {
        code: 'forbidden',
        message: 'Login failed for [connection string] ([hidden])',
        isRetryable: false,
      },
    });
    drivers.sqlServer.test.mockRejectedValueOnce(new AppError('network', 'Could not reach SQL Server.'));
    const network = await post('/v1/sqlserver/test', { connectionString: CONNECTION_STRING });
    expect(network.status).toBe(502);
    expect(relayErrorSchema.parse(await network.json()).error.isRetryable).toBe(true);
    expect(lines.join('\n')).not.toContain('hunter22secret');
  });

  it('logs each request as its method, path, status and time', async () => {
    const { lines, post } = setup();
    await post('/v1/sqlserver/query', { connectionString: CONNECTION_STRING, sql: 'SELECT 1' });
    expect(lines).toEqual([expect.stringMatching(/^POST \/v1\/sqlserver\/query 200 \d+ms$/)]);
  });

  it('says when there is no such route', async () => {
    const { post } = setup();
    const res = await post('/v1/postgres/query', {});
    expect(res.status).toBe(404);
    expect(relayErrorSchema.parse(await res.json()).error.code).toBe('not_found');
  });
});
