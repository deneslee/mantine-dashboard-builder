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

/**
 * A datasource: a built-in one, or a connection of an optional plugin's type. `app/plugins.ts` and
 * `app/useAppPlugins.ts` collect them; features read them through `usePlugins`.
 */
export interface DatasourcePlugin {
  /** What a query's `datasource` names: a built-in's id (`mock`) or a connection's (`analytics`). */
  id: string;
  name: string;
  querySchema?: z.ZodType;
  /** Its results depend on the time range: the range and time zone are part of each query's cache key. */
  isTimeAware: boolean;
  /**
   * Changes whenever a connection's settings or secrets change. It is part of each query's cache
   * key, so results fetched before an edit are never shown after it. Built-ins have none.
   */
  revision?: string;
  /**
   * One query's frames: usually one, more when a query returns several series. Rejects with an
   * `AppError`; honours `signal`.
   */
  query(spec: unknown, ctx: QueryContext, signal?: AbortSignal): Promise<DataFrame[]>;
}
