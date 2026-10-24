import { z } from 'zod';
import { AppError } from '@/core/errors/AppError';
import { dataFrameSchema } from '@/core/data/dataFrameSchema';
import type { DatasourcePlugin } from '@/plugins/DatasourcePlugin';
import { wait } from '@/utils/wait';

/** A path under `public/data/`, e.g. `frames/regions.json`. */
const spec = z.object({
  path: z
    .string()
    .regex(/^[\w./-]+\.json$/, 'Expected a .json path under data/.')
    .refine((path) => !path.includes('..'), 'The path must stay inside data/.'),
});

const BASE = `${import.meta.env.BASE_URL}data/`;

/** Simulated latency so loading states are visible in development. */
const LATENCY = import.meta.env.DEV ? 400 : 0;

/** Reads a DataFrame from a static JSON file. The time range doesn't apply. */
export const localJsonDatasource: DatasourcePlugin = {
  id: 'local-json',
  name: 'Local JSON',
  querySchema: spec,
  isTimeAware: false,
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
      throw new AppError('datasource', `No data file at data/${path}.`, { isRetryable: false });

    const frame = dataFrameSchema.safeParse(await res.json());
    if (!frame.success)
      throw new AppError('validation', `data/${path} isn't a valid data frame.`, {
        details: frame.error.issues,
      });
    return [frame.data];
  },
};
