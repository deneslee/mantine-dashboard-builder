import { z } from 'zod';
import { AppError } from '@/lib/errors/AppError';
import type { DataFrame } from '@/types/dataframe';
import type { DatasourceDefinition } from '@/types/datasource';
import { wait } from '@/utils/wait';

/** A path under `public/data/`, e.g. `frames/regions.json`. */
const spec = z.object({
  path: z
    .string()
    .regex(/^[\w./-]+\.json$/, 'Expected a .json path under data/.')
    .refine((path) => !path.includes('..'), 'The path must stay inside data/.'),
});

/** A DataFrame as a JSON file; `length` comes from the values. */
const frameDto = z
  .object({
    name: z.string().optional(),
    fields: z
      .array(
        z.object({
          name: z.string(),
          type: z.enum(['time', 'number', 'string', 'boolean']),
          values: z.array(z.unknown()),
          config: z.object({ label: z.string().optional(), unit: z.string().optional() }).optional(),
        }),
      )
      .min(1),
  })
  .refine(
    (frame) => frame.fields.every((field) => field.values.length === frame.fields[0]?.values.length),
    'Every field needs the same number of values.',
  );

const BASE = `${import.meta.env.BASE_URL}data/`;

/** Simulated latency so loading states are visible in development. */
const LATENCY = import.meta.env.DEV ? 400 : 0;

/** Reads a DataFrame from a static JSON file. The time range doesn't apply. */
export const localJsonDatasource: DatasourceDefinition = {
  type: 'local-json',
  name: 'Local JSON',
  querySchema: spec,
  async query(input, _ctx, signal) {
    const parsedSpec = spec.safeParse(input);
    if (!parsedSpec.success)
      throw new AppError('validation', "This query doesn't fit the local JSON datasource.", {
        details: parsedSpec.error.issues,
      });
    const { path } = parsedSpec.data;
    await wait(LATENCY, signal);

    let res: Response;
    try {
      res = await fetch(BASE + path, { signal });
    } catch (e) {
      if (signal?.aborted) throw e;
      throw new AppError('network', 'Could not load the data file. Check your connection.', { cause: e });
    }
    // The dev server answers unknown paths with index.html, so anything that isn't JSON is missing.
    if (!res.ok || !res.headers.get('content-type')?.includes('json'))
      throw new AppError('datasource', `No data file at data/${path}.`, { retryable: false });

    const frame = frameDto.safeParse(await res.json());
    if (!frame.success)
      throw new AppError('validation', `data/${path} isn't a valid data frame.`, {
        details: frame.error.issues,
      });
    const { name, fields } = frame.data;
    return { name, length: fields[0]?.values.length ?? 0, fields } satisfies DataFrame;
  },
};
