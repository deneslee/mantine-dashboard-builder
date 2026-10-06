import { z } from 'zod';
import { AppError } from '@/core/errors/AppError';
import type { DataFrame, Field } from '@/core/data/DataFrame';
import type { DatasourcePlugin, QueryContext } from '@/plugins/DatasourcePlugin';
import { wait } from '@/utils/wait';

const seriesSpec = z.object({
  kind: z.literal('series'),
  seed: z.string(),
  points: z.number().int().min(2).max(5000).default(48),
  fields: z
    .array(
      z.object({
        name: z.string(),
        label: z.string().optional(),
        unit: z.string().optional(),
        /** Where the random walk starts. */
        base: z.number(),
        /** How far one step may move. */
        spread: z.number().nonnegative(),
      }),
    )
    .min(1),
});

const tableSpec = z.object({
  kind: z.literal('table'),
  seed: z.string(),
  rows: z.number().int().positive().max(100_000),
});

/** Always fails, to show a widget's error state through the real datasource path. */
const errorSpec = z.object({ kind: z.literal('error'), message: z.string() });

const spec = z.discriminatedUnion('kind', [seriesSpec, tableSpec, errorSpec]);

/** A deterministic random source: the same seed gives the same numbers. */
function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** Seeded by the range as written, so a refresh of `now-24h` keeps its shape while the times move. */
const random = (seed: string, { raw }: QueryContext) => seeded(`${seed}:${raw.from}:${raw.to}`);

/** Random walks over the range: one `time` field, then one number field per spec field. */
function series(s: z.infer<typeof seriesSpec>, ctx: QueryContext): DataFrame {
  const rand = random(s.seed, ctx);
  const from = ctx.range.from.getTime();
  const step = (ctx.range.to.getTime() - from) / (s.points - 1);
  const time = Array.from({ length: s.points }, (_, i) => Math.round(from + i * step));
  const fields: Field[] = [{ name: 'time', type: 'time', values: time, config: { label: 'Time' } }];
  for (const f of s.fields) {
    let value = f.base;
    const values = time.map(() => {
      value = Math.max(0, value + (rand() - 0.48) * f.spread);
      return Math.round(value);
    });
    fields.push({ name: f.name, type: 'number', values, config: { label: f.label, unit: f.unit } });
  }
  return { length: s.points, fields };
}

const methods = ['GET', 'GET', 'GET', 'POST', 'PUT', 'DELETE'];
const paths = ['/api/dashboards', '/api/widgets', '/api/query', '/api/users/me', '/api/export', '/health'];

/** A request log, newest first: a table of any length for the table widget. */
function table(s: z.infer<typeof tableSpec>, ctx: QueryContext): DataFrame {
  const rand = random(s.seed, ctx);
  const pick = (list: string[]) => list[Math.floor(rand() * list.length)] ?? '';
  const to = ctx.range.to.getTime();
  const span = to - ctx.range.from.getTime();
  const time: number[] = [];
  const method: string[] = [];
  const path: string[] = [];
  const status: number[] = [];
  const duration: number[] = [];
  for (let i = 0; i < s.rows; i++) {
    time.push(Math.round(to - (i / s.rows) * span));
    method.push(pick(methods));
    path.push(pick(paths));
    const r = rand();
    status.push(r < 0.9 ? 200 : r < 0.96 ? 404 : 500);
    duration.push(Math.round(20 + rand() ** 3 * 900));
  }
  return {
    name: 'requests',
    length: s.rows,
    fields: [
      { name: 'time', type: 'time', values: time, config: { label: 'Time' } },
      { name: 'method', type: 'string', values: method, config: { label: 'Method' } },
      { name: 'path', type: 'string', values: path, config: { label: 'Path' } },
      { name: 'status', type: 'number', values: status, config: { label: 'Status' } },
      { name: 'duration', type: 'number', values: duration, config: { label: 'Duration', unit: 'ms' } },
    ],
  };
}

/** Generated data for demos and tests, with a random delay so loading states show. */
export const mockDatasource: DatasourcePlugin = {
  type: 'mock',
  name: 'Mock data',
  querySchema: spec,
  isTimeAware: true,
  async query(input, ctx, signal) {
    const parsed = spec.safeParse(input);
    if (!parsed.success)
      throw new AppError('validation', "This query doesn't fit the mock datasource.", {
        details: parsed.error.issues,
      });
    await wait(300 + Math.random() * 700, signal);
    const s = parsed.data;
    switch (s.kind) {
      case 'error':
        throw new AppError('datasource', s.message);
      case 'series':
        return [series(s, ctx)];
      case 'table':
        return [table(s, ctx)];
    }
  },
};
