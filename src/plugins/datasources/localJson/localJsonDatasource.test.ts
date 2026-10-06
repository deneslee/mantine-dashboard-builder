import { afterEach, describe, expect, it, vi } from 'vitest';
import type { QueryContext } from '@/plugins/DatasourcePlugin';
import { localJsonDatasource } from './localJsonDatasource';

const ctx: QueryContext = {
  range: { from: new Date(0), to: new Date(1) },
  raw: { from: 'now-24h', to: 'now' },
  timeZone: 'UTC',
};

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' }, ...init });

const regions = {
  name: 'regions',
  fields: [
    { name: 'region', type: 'string', values: ['Nordics', 'Iberia'] },
    { name: 'revenue', type: 'number', values: [100, 200], config: { unit: '€' } },
  ],
};

describe('localJsonDatasource', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reads a frame from a file under data/', async () => {
    const fetch = vi.fn().mockResolvedValue(json(regions));
    vi.stubGlobal('fetch', fetch);
    const [frame] = await localJsonDatasource.query({ path: 'frames/regions.json' }, ctx);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/data\/frames\/regions\.json$/),
      expect.anything(),
    );
    expect(frame?.length).toBe(2);
    expect(frame?.fields.map((f) => f.name)).toEqual(['region', 'revenue']);
  });

  it('reports a missing file, including the dev server answering with HTML', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not found', { status: 404 })));
    await expect(localJsonDatasource.query({ path: 'frames/nope.json' }, ctx)).rejects.toMatchObject({
      code: 'datasource',
    });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } })),
    );
    await expect(localJsonDatasource.query({ path: 'frames/nope.json' }, ctx)).rejects.toMatchObject({
      code: 'datasource',
    });
  });

  it('rejects a file that is not a frame, and paths outside data/', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        json({
          fields: [
            { name: 'a', type: 'number', values: [1, 2] },
            { name: 'b', type: 'number', values: [1] },
          ],
        }),
      ),
    );
    await expect(localJsonDatasource.query({ path: 'frames/bad.json' }, ctx)).rejects.toMatchObject({
      code: 'validation',
    });
    await expect(localJsonDatasource.query({ path: '../secrets.json' }, ctx)).rejects.toMatchObject({
      code: 'validation',
    });
    await expect(
      localJsonDatasource.query({ path: 'https://example.com/x.json' }, ctx),
    ).rejects.toMatchObject({
      code: 'validation',
    });
  });
});
