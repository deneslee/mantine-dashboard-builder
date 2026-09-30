import { z } from 'zod';
import { isValidTime } from '../model/timeRange';
import { tokens } from '@/design-system/tokens/tokens';
import type { Breakpoint } from '../model/layouts';

/** Wire shapes. Today local JSON files, later the HTTP API; only this file and the mapper change. */
export const dashboardSummaryDto = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().default(''),
  updated_at: z.string(),
  widget_count: z.number().int().nonnegative(),
  tags: z.array(z.string()).default([]),
});

export const dashboardListDto = z.object({ items: z.array(dashboardSummaryDto) });

export type DashboardSummaryDto = z.infer<typeof dashboardSummaryDto>;

const time = z.string().refine(isValidTime, 'Expected now, now-<n><s|m|h|d|w> or an ISO date.');

const layout = z.array(
  z.object({
    i: z.string(),
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    w: z.number().int().positive(),
    h: z.number().int().positive(),
  }),
);

const widget = z.object({
  type: z.string(),
  title: z.string().trim().min(1),
  description: z.string().optional(),
  options: z.record(z.string(), z.unknown()).default({}),
  queries: z.array(z.object({ datasource: z.string(), spec: z.unknown() })).default([]),
});

/**
 * A stored dashboard, version 1. Widgets are keyed by id and the layouts place them by id, so
 * what a widget shows and where it sits are separate (as in Perses). `lg` is required; `md` and
 * `sm` only where the reading-order reflow gets it wrong.
 */
export const dashboardDocV1 = z
  .object({
    version: z.literal(1),
    id: z.string(),
    title: z.string(),
    description: z.string().default(''),
    tags: z.array(z.string()).default([]),
    updatedAt: z.string(),
    timeRange: z.object({ from: time, to: time }),
    refresh: z.string().default('off'),
    /** Reserved for template variables (phase 4). */
    variables: z.array(z.unknown()).default([]),
    widgets: z.record(z.string(), widget),
    layouts: z.object({ lg: layout, md: layout.optional(), sm: layout.optional() }),
  })
  .superRefine((doc, ctx) => {
    for (const [breakpoint, items] of Object.entries(doc.layouts)) {
      if (!items) continue;
      for (const item of items) {
        if (item.x + item.w > tokens.grid.cols[breakpoint as Breakpoint])
          ctx.addIssue({
            code: 'custom',
            path: ['layouts', breakpoint],
            message: `Widget "${item.i}" exceeds the ${breakpoint} grid width.`,
          });
      }
      const placed = new Set(items.map((item) => item.i));
      if (placed.size !== items.length)
        ctx.addIssue({
          code: 'custom',
          path: ['layouts', breakpoint],
          message: `The ${breakpoint} layout places a widget more than once.`,
        });
      for (const id of Object.keys(doc.widgets)) {
        if (!placed.has(id))
          ctx.addIssue({
            code: 'custom',
            path: ['layouts', breakpoint],
            message: `Widget "${id}" has no place in the ${breakpoint} layout.`,
          });
      }
      for (const id of placed) {
        if (!Object.hasOwn(doc.widgets, id))
          ctx.addIssue({
            code: 'custom',
            path: ['layouts', breakpoint],
            message: `The ${breakpoint} layout places a widget that doesn't exist: "${id}".`,
          });
      }
    }
  });

/** Every stored version. A v2 adds its schema here and a migration in the mapper. */
export const dashboardDoc = z.discriminatedUnion('version', [dashboardDocV1]);

export type DashboardDocDto = z.infer<typeof dashboardDoc>;
