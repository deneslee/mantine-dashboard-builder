import { z } from 'zod';
import { dataFrameSchema } from '../data/dataFrameSchema';
import { APP_ERROR_CODES } from '../errors/AppError';

/**
 * What the browser and the relay (`relay/`) send each other. Browsers can't speak SQL Server's or
 * MongoDB's protocols, so those queries go through the relay: the connection string comes with each
 * request and the relay keeps nothing. Plan: .agents/planning/plans/11-optional-plugins.md.
 */

export const RELAY_ROUTES = {
  sqlServerQuery: '/v1/sqlserver/query',
  sqlServerTest: '/v1/sqlserver/test',
  mongoQuery: '/v1/mongodb/query',
  mongoTest: '/v1/mongodb/test',
  health: '/v1/health',
} as const;

/** The most rows any query may return; the relay may set a lower limit. */
export const RELAY_MAX_ROWS = 100_000;
export const RELAY_DEFAULT_ROWS = 10_000;

const connectionString = z.string().trim().min(1, 'Enter a connection string.').max(4096);
const maxRows = z.number().int().positive().max(RELAY_MAX_ROWS).default(RELAY_DEFAULT_ROWS);

/** The query's time range; the relay binds it as `@__from`, `@__to`, `@__fromMs` and `@__toMs`. */
export const relayRangeSchema = z.object({ from: z.iso.datetime(), to: z.iso.datetime() });

export const sqlServerQuerySchema = z.object({
  connectionString,
  sql: z.string().min(1).max(100_000),
  range: relayRangeSchema.optional(),
  maxRows,
});

export const sqlServerTestSchema = z.object({ connectionString });

export const mongoQuerySchema = z.object({
  connectionString,
  database: z.string().min(1).max(64),
  collection: z.string().min(1).max(255),
  /** An aggregation pipeline as Extended JSON text, so `{"$date": …}` and `{"$oid": …}` survive. */
  pipeline: z.string().min(2).max(100_000),
  maxRows,
});

export const mongoTestSchema = z.object({ connectionString, database: z.string().min(1).max(64).optional() });

/** A query's result. */
export const relayFramesSchema = z.object({ frames: z.array(dataFrameSchema) });

/** A test's result: what the server says it is, for the connection page. */
export const relayTestResultSchema = z.object({ ok: z.literal(true), server: z.string() });

/** Every failure. The message never contains the connection string. */
export const relayErrorSchema = z.object({
  error: z.object({ code: z.enum(APP_ERROR_CODES), message: z.string() }),
});

export type SqlServerQuery = z.input<typeof sqlServerQuerySchema>;
export type MongoQuery = z.input<typeof mongoQuerySchema>;
export type RelayError = z.infer<typeof relayErrorSchema>;
