import { z } from 'zod';
import { dataFrameSchema } from '../data/dataFrameSchema';
import { maxRowsSchema } from '../data/maxRows';
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

const connectionString = z.string().trim().min(1, 'Enter a connection string.').max(4096);

/** The query's time range; the relay binds it as `@__from`, `@__to`, `@__fromMs` and `@__toMs`. */
export const relayRangeSchema = z.object({ from: z.iso.datetime(), to: z.iso.datetime() });

export const sqlServerQuerySchema = z.object({
  connectionString,
  sql: z.string().min(1).max(100_000),
  range: relayRangeSchema.optional(),
  maxRows: maxRowsSchema,
});

export const sqlServerTestSchema = z.object({ connectionString });

export const mongoQuerySchema = z.object({
  connectionString,
  database: z.string().min(1).max(64),
  collection: z.string().min(1).max(255),
  /** An aggregation pipeline as Extended JSON text, so `{"$date": …}` and `{"$oid": …}` survive. */
  pipeline: z.string().min(2).max(100_000),
  maxRows: maxRowsSchema,
});

export const mongoTestSchema = z.object({ connectionString, database: z.string().min(1).max(64).optional() });

/** A query's result. */
export const relayFramesSchema = z.object({ frames: z.array(dataFrameSchema) });

/** A test's result: what the server says it is, for the connection page. */
export const relayTestResultSchema = z.object({ ok: z.literal(true), server: z.string() });

/**
 * Every failure. The message never contains the connection string. `isRetryable` is false for
 * failures that would fail again, such as a SQL syntax error.
 */
export const relayErrorSchema = z.object({
  error: z.object({
    code: z.enum(APP_ERROR_CODES),
    message: z.string(),
    isRetryable: z.boolean().optional(),
  }),
});

export type SqlServerQuery = z.input<typeof sqlServerQuerySchema>;
export type MongoQuery = z.input<typeof mongoQuerySchema>;
export type RelayError = z.infer<typeof relayErrorSchema>;
