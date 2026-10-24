import { z } from 'zod';

/** The most rows one query may return, whatever the datasource. */
export const MAX_ROWS = 100_000;
export const DEFAULT_ROWS = 10_000;

/** A query spec's `maxRows`: 10,000 unless it says otherwise, never more than 100,000. */
export const maxRowsSchema = z.number().int().positive().max(MAX_ROWS).default(DEFAULT_ROWS);
