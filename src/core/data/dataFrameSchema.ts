import { z } from 'zod';
import type { DataFrame } from './DataFrame';

/**
 * A DataFrame as JSON: a data file, or a relay's response. `length` comes from the values, and
 * every field must have the same number of them.
 */
export const dataFrameSchema = z
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
  )
  .transform(({ name, fields }): DataFrame => ({ name, length: fields[0]?.values.length ?? 0, fields }));
