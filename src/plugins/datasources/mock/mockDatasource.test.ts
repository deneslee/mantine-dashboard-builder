import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '@/core/errors/AppError';
import type { QueryContext } from '@/plugins/DatasourcePlugin';
import { mockDatasource } from './mockDatasource';

const ctx: QueryContext = {
  range: { from: new Date('2026-09-26T12:00:00Z'), to: new Date('2026-09-27T12:00:00Z') },
  raw: { from: 'now-24h', to: 'now' },
};

const series = {
  kind: 'series',
  seed: 'test',
  fields: [{ name: 'revenue', unit: '€', base: 100, spread: 10 }],
};

/** Runs a query past the mock's random latency. */
async function run(spec: unknown, context = ctx) {
  const result = mockDatasource.query(spec, context);
  result.catch(() => {});
  await vi.runAllTimersAsync();
  return result;
}

describe('mockDatasource', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns a time field spread over the range and one number field per spec field', async () => {
    const frame = await run(series);
    expect(frame.length).toBe(48);
    expect(frame.fields.map((f) => [f.name, f.type])).toEqual([
      ['time', 'time'],
      ['revenue', 'number'],
    ]);
    const time = frame.fields[0]?.values;
    expect(time?.[0]).toBe(ctx.range.from.getTime());
    expect(time?.at(-1)).toBe(ctx.range.to.getTime());
    expect(frame.fields[1]?.config?.unit).toBe('€');
  });

  it('gives the same data for the same seed and range, and different data for another range', async () => {
    const values = async (context: QueryContext) => (await run(series, context)).fields[1]?.values;
    expect(await values(ctx)).toEqual(await values(ctx));
    expect(await values({ ...ctx, raw: { from: 'now-7d', to: 'now' } })).not.toEqual(await values(ctx));
  });

  it('generates a table of any length', async () => {
    const frame = await run({ kind: 'table', seed: 'log', rows: 10_000 });
    expect(frame.length).toBe(10_000);
    expect(frame.fields.every((f) => f.values.length === 10_000)).toBe(true);
  });

  it('fails an error spec with a datasource error, and a bad spec with a validation error', async () => {
    await expect(run({ kind: 'error', message: 'Haystack returned 502' })).rejects.toMatchObject({
      code: 'datasource',
      message: 'Haystack returned 502',
    });
    await expect(run({ kind: 'nope' })).rejects.toBeInstanceOf(AppError);
    await expect(run({ kind: 'nope' })).rejects.toMatchObject({ code: 'validation' });
  });

  it('stops when the query is aborted', async () => {
    const controller = new AbortController();
    const result = mockDatasource.query(series, ctx, controller.signal);
    controller.abort();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });
});
