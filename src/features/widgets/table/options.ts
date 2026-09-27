import { z } from 'zod';

export const columnOptions = z.object({
  /** Header text; the field's label when missing. */
  label: z.string().optional(),
  /** Numbers align right, text left, unless set. */
  align: z.enum(['left', 'center', 'right']).optional(),
  /** `percent` shows 0.31 as 31.0%. */
  format: z.enum(['number', 'percent']).optional(),
});

/** Per-field overrides, keyed by field name. */
export const tableOptions = z.object({
  columns: z.record(z.string(), columnOptions).default({}),
});

export type ColumnOptions = z.infer<typeof columnOptions>;
export type TableOptions = z.infer<typeof tableOptions>;
