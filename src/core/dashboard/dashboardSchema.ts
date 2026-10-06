import { z } from 'zod';
import { isValidTimeZone, timeOverrideSchema, timeSchema } from '../time/timeRange';
import { compareReadingOrder, GRID_COLUMNS, type Breakpoint } from './layout';

/** An entry in `data/dashboards/index.json`, the dashboard list. */
export const dashboardSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().default(''),
  updatedAt: z.string(),
  widgetCount: z.number().int().nonnegative(),
  tags: z.array(z.string()).default([]),
});

export const dashboardListSchema = z.object({ items: z.array(dashboardSummarySchema) });

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

const layout = z.array(
  z.object({
    i: z.string(),
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    w: z.number().int().positive(),
    h: z.number().int().positive(),
  }),
);

/** A tile: which widget plugin draws it, its options (the plugin checks them) and its queries. */
const widget = z.object({
  type: z.string(),
  title: z.string().trim().min(1),
  description: z.string().optional(),
  options: z.record(z.string(), z.unknown()).default({}),
  queries: z.array(z.object({ datasource: z.string(), spec: z.unknown() })).default([]),
  /** Its own range or a shift of the dashboard's; absent: inherit. */
  time: timeOverrideSchema.optional(),
});

/**
 * A dashboard exactly as it is saved, exported and fetched. Widgets are keyed by id and the
 * layouts place them by id, so what a widget shows and where it sits are separate (as in Perses).
 * `lg` is required; `md` and `sm` only where the reading-order reflow gets it wrong.
 */
export const dashboardSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string(),
    title: z.string(),
    description: z.string().default(''),
    tags: z.array(z.string()).default([]),
    updatedAt: z.string(),
    /** Defaults; the URL overrides them. */
    timeRange: z.object({ from: timeSchema, to: timeSchema }),
    /** For relative ranges such as `now/d`; absent: the viewer's. The URL's `tz` overrides it. */
    timeZone: z
      .string()
      .refine(isValidTimeZone, 'Expected an IANA time zone, e.g. Europe/Budapest.')
      .optional(),
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
        if (item.x + item.w > GRID_COLUMNS[breakpoint as Breakpoint])
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

export type Dashboard = z.infer<typeof dashboardSchema>;
export type Widget = Dashboard['widgets'][string];

/**
 * Brings stored JSON of any earlier `schemaVersion` to the current one. Unknown input passes
 * through, so `dashboardSchema` reports what is wrong with it.
 */
export function migrateDashboard(json: unknown): unknown {
  if (typeof json !== 'object' || json === null || 'schemaVersion' in json) return json;
  // ponytail: files saved before Oct 2026 call it `version`; delete after 2027-01.
  if ('version' in json && json.version === 1) {
    const { version: _version, ...rest } = json;
    return { schemaVersion: 1, ...rest };
  }
  return json;
}

/** Reads a dashboard from any source (file, saved copy, draft, import): migrate, then validate. */
export const storedDashboardSchema = z.preprocess(migrateDashboard, dashboardSchema);

/** Widgets in `lg` reading order, so a saved or exported file reads top to bottom. */
export function orderWidgets(dashboard: Dashboard): Dashboard {
  const ids = dashboard.layouts.lg.toSorted(compareReadingOrder).map((item) => item.i);
  return { ...dashboard, widgets: Object.fromEntries(ids.map((id) => [id, dashboard.widgets[id]!])) };
}
