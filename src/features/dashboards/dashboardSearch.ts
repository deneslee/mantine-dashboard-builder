import { z } from 'zod';
import {
  isValidTime,
  isValidTimeZone,
  parseRefreshInterval,
  timeOverrideSchema,
} from '@/core/time/timeRange';

/**
 * `/dashboards/$id`'s search params: `?mode=edit&widget=<id>&editor=queries&from=now-24h&to=now&refresh=1m`,
 * `tz` (a time zone) and `wt` (viewers' widget time overrides, by widget id).
 * Invalid values are dropped, so the dashboard's own defaults apply instead.
 */
export const dashboardSearchSchema = z.object({
  mode: z.enum(['view', 'edit']).default('view').catch('view'),
  widget: z.string().min(1).optional().catch(undefined),
  editor: z.literal('queries').optional().catch(undefined),
  from: z.string().refine(isValidTime).optional().catch(undefined),
  tz: z.string().refine(isValidTimeZone).optional().catch(undefined),
  wt: z.record(z.string(), timeOverrideSchema).optional().catch(undefined),
  to: z.string().refine(isValidTime).optional().catch(undefined),
  refresh: z
    .string()
    .refine((value) => value === 'off' || parseRefreshInterval(value) !== undefined)
    .optional()
    .catch(undefined),
});

export type DashboardSearch = Partial<z.output<typeof dashboardSearchSchema>>;
