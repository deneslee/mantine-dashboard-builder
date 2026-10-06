import type { DataFrame } from '@/core/data/DataFrame';
import type { TimeRange, ResolvedRange } from '@/core/time/timeRange';
import type { z } from 'zod';

/** One query in a widget: which datasource to ask, and what to ask it (the datasource checks the spec). */
export interface Query {
  datasource: string;
  spec: unknown;
}

export interface QueryContext {
  /** The range resolved to absolute times when the query runs. */
  range: ResolvedRange;
  /** The range as written (`now-24h`), stable across refreshes; the mock seeds its data with it. */
  raw: TimeRange;
  /** The time zone `raw` was resolved in, for datasources that bucket by calendar day. */
  timeZone: string;
}

/** A datasource plugin. `app/plugins.ts` collects them; features read them through `usePlugins`. */
export interface DatasourcePlugin {
  type: string;
  name: string;
  querySchema?: z.ZodType;
  /** Its results depend on the time range: the range and time zone are part of each query's cache key. */
  isTimeAware: boolean;
  /**
   * One query's frames: usually one, more when a query returns several series. Rejects with an
   * `AppError`; honours `signal`.
   */
  query(spec: unknown, ctx: QueryContext, signal?: AbortSignal): Promise<DataFrame[]>;
}
