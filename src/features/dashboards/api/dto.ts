import { z } from 'zod';

/** Wire shape. Today a local JSON file, later the HTTP API; only this file and the mapper change. */
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
