import type { DataFrame } from './dataframe';
import type { z } from 'zod';

export interface TimeRange {
  from: Date;
  to: Date;
}

/** One query in a widget: which datasource to ask, and what to ask it (the datasource checks the spec). */
export interface Query {
  datasource: string;
  spec: unknown;
}

export interface QueryContext {
  /** The range resolved to absolute times when the query runs. */
  range: TimeRange;
  /** The range as written (`now-24h`), stable across refreshes; the mock seeds its data with it. */
  raw: { from: string; to: string };
}

/** A datasource plugin. Features define them; `app/registry.ts` collects them. */
export interface DatasourceDefinition {
  type: string;
  name: string;
  querySchema?: z.ZodType;
  /** Rejects with an `AppError`; honours `signal`. */
  query(spec: unknown, ctx: QueryContext, signal?: AbortSignal): Promise<DataFrame>;
}
