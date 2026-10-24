import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import type { QueryContext } from '@/plugins/DatasourcePlugin';
import { mongodbSpecSchema } from './mongodbPlugin';
import { mongodbRuntime, mongoPipeline } from './mongodbRuntime';

const range = { from: new Date('2026-10-24T00:00:00Z'), to: new Date('2026-10-25T00:00:00Z') };
const ctx = { range } as QueryContext;
const connection = {
  settings: { relayUrl: 'http://localhost:8787', database: 'shop' },
  secrets: { connectionString: 'mongodb+srv://reader:p@cluster0.abc.mongodb.net/' },
};

afterEach(() => vi.unstubAllGlobals());

describe('mongodbSpecSchema', () => {
  it('takes pipelines that read, and refuses the ones that write or run code', () => {
    expect(mongodbSpecSchema.safeParse({ collection: 'orders', pipeline: [{ $match: {} }] }).success).toBe(
      true,
    );
    expect(mongodbSpecSchema.safeParse({ collection: 'orders', pipeline: [{ $out: 'copy' }] }).success).toBe(
      false,
    );
    expect(mongodbSpecSchema.safeParse({ collection: 'orders', pipeline: { $match: {} } }).success).toBe(
      false,
    );
  });
});

describe('mongoPipeline', () => {
  it('writes time macros as Extended JSON dates, or epoch milliseconds', () => {
    expect(
      JSON.parse(
        mongoPipeline(
          [{ $match: { at: { $gte: '$__from', $lt: '$__to' }, ms: { $lt: '$__toMs' }, field: '$at' } }],
          range,
        ),
      ),
    ).toEqual([
      {
        $match: {
          at: { $gte: { $date: '2026-10-24T00:00:00.000Z' }, $lt: { $date: '2026-10-25T00:00:00.000Z' } },
          ms: { $lt: 1_792_886_400_000 },
          field: '$at',
        },
      },
    ]);
  });
});

describe('mongodbRuntime', () => {
  it('queries the connection’s database unless the query names one', async () => {
    const fetch = vi.fn(async (_url: string, _init: RequestInit) => new Response('{"frames":[]}'));
    vi.stubGlobal('fetch', fetch);
    await mongodbRuntime.query(connection, { collection: 'orders', pipeline: [], maxRows: 10 }, ctx);
    await mongodbRuntime.query(
      connection,
      { database: 'archive', collection: 'orders', pipeline: [], maxRows: 10 },
      ctx,
    );
    const bodies = fetch.mock.calls.map(
      ([, init]) => JSON.parse(init.body as string) as { database: string },
    );
    expect(fetch.mock.calls[0]?.[0]).toBe('http://localhost:8787/v1/mongodb/query');
    expect(bodies.map((body) => body.database)).toEqual(['shop', 'archive']);
    expect(bodies[0]).toMatchObject({ collection: 'orders', pipeline: '[]', maxRows: 10 });
  });

  it('needs a database from the query or the connection', async () => {
    vi.stubGlobal('fetch', vi.fn());
    await expect(
      mongodbRuntime.query(
        { ...connection, settings: { relayUrl: 'http://localhost:8787' } },
        { collection: 'orders', pipeline: [], maxRows: 10 },
        ctx,
      ),
    ).rejects.toMatchObject({ code: 'validation' });
  });
});
