import { z } from 'zod';
import type { Dashboard } from '@/core/dashboard/dashboardSchema';
import {
  isValidTime,
  localTimeZone,
  isValidTimeZone,
  parseRefreshInterval,
  timeOverrideSchema,
  type TimeRange,
} from '@/core/time/timeRange';

/**
 * `/dashboards/$id`'s search params: `?mode=edit&widget=<id>&editor=queries&from=now-24h&to=now&refresh=1m`,
 * `tz` (a time zone), `wt` (viewers' widget time overrides, by widget id), `view` (one widget full screen),
 * and `inspect` with `inspectTab` (the Inspect drawer).
 * Invalid values are dropped, so the dashboard's own defaults apply instead.
 */
export const dashboardSearchSchema = z.object({
  mode: z.enum(['view', 'edit']).default('view').catch('view'),
  widget: z.string().min(1).optional().catch(undefined),
  editor: z.literal('queries').optional().catch(undefined),
  view: z.string().min(1).optional().catch(undefined),
  inspect: z.string().min(1).optional().catch(undefined),
  inspectTab: z.enum(['data', 'query', 'json', 'stats']).optional().catch(undefined),
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

/** The time a dashboard shows: the URL's values, else the document's saved defaults (contracts §5). */
export interface DashboardTime {
  range: TimeRange;
  refresh: string;
  timeZone: string;
}

/** The URL's time over the dashboard's defaults. The same rule in view and edit mode, page and route. */
export function resolveDashboardTime(
  dashboard: Pick<Dashboard, 'timeRange' | 'refresh' | 'timeZone'>,
  search: Pick<DashboardSearch, 'from' | 'to' | 'refresh' | 'tz'>,
): DashboardTime {
  return {
    range: { from: search.from ?? dashboard.timeRange.from, to: search.to ?? dashboard.timeRange.to },
    refresh: search.refresh ?? dashboard.refresh,
    timeZone: search.tz || dashboard.timeZone || localTimeZone(),
  };
}

export type InspectTab = NonNullable<DashboardSearch['inspectTab']>;
