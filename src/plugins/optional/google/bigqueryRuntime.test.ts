import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import type { QueryContext } from '@/plugins/DatasourcePlugin';
import { bigqueryParameters, bigqueryRuntime, bigqueryToFrame } from './bigqueryRuntime';

const range = { from: new Date('2026-10-24T00:00:00Z'), to: new Date('2026-10-25T00:00:00Z') };
const ctx = { range, raw: { from: 'now-1d', to: 'now' }, timeZone: 'UTC' } as QueryContext;
const connection = {
  settings: { projectId: 'my-dashboards-123', location: 'EU' },
  secrets: { accessToken: 'ya29.t' },
};

afterEach(() => vi.unstubAllGlobals());

describe('bigqueryToFrame', () => {
  it('types fields from the schema and converts BigQuery’s string values', () => {
    const frame = bigqueryToFrame(
      [
        { name: 'at', type: 'TIMESTAMP' },
        { name: 'day', type: 'DATE' },
        { name: 'orders', type: 'INTEGER' },
        { name: 'share', type: 'FLOAT64' },
        { name: 'isPaid', type: 'BOOL' },
        { name: 'tags', type: 'STRING', mode: 'REPEATED' },
        { name: 'note', type: 'STRING' },
      ],
      [
        {
          f: [
            { v: '1792800000000000' },
            { v: '2026-10-24' },
            { v: '42' },
            { v: '0.25' },
            { v: 'true' },
            { v: [{ v: 'a' }] },
            { v: null },
          ],
        },
      ],
    );
    expect(frame.fields.map((field) => [field.name, field.type, field.values[0]])).toEqual([
      ['at', 'time', 1792800000000],
      ['day', 'time', Date.parse('2026-10-24T00:00:00Z')],
      ['orders', 'number', 42],
      ['share', 'number', 0.25],
      ['isPaid', 'boolean', true],
      ['tags', 'string', '[{"v":"a"}]'],
      ['note', 'string', null],
    ]);
  });
});

describe('bigqueryParameters', () => {
  it('turns time macros into named parameters, each once', () => {
    const { query, parameters } = bigqueryParameters(
      'SELECT * FROM t WHERE at BETWEEN $__from AND $__to OR ms > $__fromMs OR at < $__to',
      range,
    );
    expect(query).toBe('SELECT * FROM t WHERE at BETWEEN @__from AND @__to OR ms > @__fromMs OR at < @__to');
    expect(parameters).toEqual([
      {
        name: '__from',
        parameterType: { type: 'TIMESTAMP' },
        parameterValue: { value: '2026-10-24T00:00:00.000Z' },
      },
      {
        name: '__to',
        parameterType: { type: 'TIMESTAMP' },
        parameterValue: { value: '2026-10-25T00:00:00.000Z' },
      },
      {
        name: '__fromMs',
        parameterType: { type: 'INT64' },
        parameterValue: { value: String(range.from.getTime()) },
      },
    ]);
  });
});

describe('bigqueryRuntime', () => {
  const json = (body: object, status = 200) => new Response(JSON.stringify(body), { status });

  it('waits for the job, reads every page up to maxRows and sends the location and parameters', async () => {
    const schema = { fields: [{ name: 'n', type: 'INTEGER' }] };
    const job = { projectId: 'my-dashboards-123', jobId: 'job_1', location: 'EU' };
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json({ jobComplete: false, jobReference: job }))
      .mockResolvedValueOnce(
        json({ jobComplete: true, jobReference: job, schema, rows: [{ f: [{ v: '1' }] }], pageToken: 'p2' }),
      )
      .mockResolvedValueOnce(
        json({ jobComplete: true, schema, rows: [{ f: [{ v: '2' }] }, { f: [{ v: '3' }] }] }),
      );
    vi.stubGlobal('fetch', fetch);
    const frames = await bigqueryRuntime.query(
      connection,
      { sql: 'SELECT n FROM t WHERE at > $__from', maxRows: 2 },
      ctx,
    );
    expect(frames[0]?.fields[0]?.values).toEqual([1, 2]);
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://bigquery.googleapis.com/bigquery/v2/projects/my-dashboards-123/queries');
    expect(JSON.parse(init.body as string)).toMatchObject({
      query: 'SELECT n FROM t WHERE at > @__from',
      location: 'EU',
      useLegacySql: false,
      queryParameters: [{ name: '__from' }],
    });
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer ya29.t');
    expect(String(fetch.mock.calls[2]?.[0])).toContain('pageToken=p2');
  });

  it('reports a SQL error with BigQuery’s message, as validation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ error: { code: 400, message: 'Unrecognized name: x at [1:8]' } }, 400)),
    );
    await expect(
      bigqueryRuntime.query(connection, { sql: 'SELECT x', maxRows: 10 }, ctx),
    ).rejects.toMatchObject({
      code: 'validation',
      message: 'BigQuery: Unrecognized name: x at [1:8]',
    });
  });

  it('tests the connection with a free dry run', async () => {
    const fetch = vi.fn(async () => json({ jobComplete: true }));
    vi.stubGlobal('fetch', fetch);
    expect(await bigqueryRuntime.test(connection)).toBe('BigQuery in project my-dashboards-123');
    expect(
      JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string),
    ).toMatchObject({
      dryRun: true,
    });
  });
});
