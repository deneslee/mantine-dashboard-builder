import { noop, type QueryClient } from '@tanstack/react-query';
import type { Dashboard } from '@/core/dashboard/dashboardSchema';
import { compareReadingOrder, type LayoutItem } from '@/core/dashboard/layout';
import { resolveWidgetTime } from '@/core/time/timeRange';
import type { Plugins } from '@/plugins/usePlugins';
import { dimensions } from '@/ui/tokens/dimensions';
import { resolveDashboardTime, type DashboardSearch } from '../dashboardSearch';
import { datasourceQuery } from './dashboardQueries';

/** The grid rows on the first screen: about 900 px of it, in the grid's row height. */
export const FIRST_SCREEN_ROWS = Math.ceil(900 / dimensions.grid.rowHeight);

/** The widgets visible on load: those whose top is on the first screen of the saved `lg` layout, in reading order. */
export function getVisibleOnLoad(layout: LayoutItem[]): string[] {
  return layout
    .filter((item) => item.y < FIRST_SCREEN_ROWS)
    .toSorted(compareReadingOrder)
    .map((item) => item.i);
}

/**
 * The route's head start ([contracts § 1]): starts the queries and the code of the widgets visible on
 * load, and returns without waiting for them. The tiles then find their results in the cache, under
 * the same keys (`datasourceQuery`). View mode only: the editor may show a draft's queries. Datasources
 * missing from `plugins` (connections, which need React) are left to their tiles. The range resolves
 * against the time the query runs, a moment before the page takes its `now`.
 */
export function startWidgetQueries(
  queryClient: QueryClient,
  dashboard: Dashboard,
  search: DashboardSearch,
  { widgets, datasources }: Pick<Plugins, 'widgets' | 'datasources'>,
): void {
  if (search.mode === 'edit') return;
  const { range, timeZone } = resolveDashboardTime(dashboard, search);
  const ids = search.view ? [search.view] : getVisibleOnLoad(dashboard.layouts.lg);
  for (const id of ids) {
    const widget = dashboard.widgets[id];
    if (!widget) continue;
    void widgets[widget.type]?.component.preload?.().catch(noop);
    const time = { ...resolveWidgetTime(range, widget.time, search.wt?.[id]), timeZone };
    for (const query of widget.queries) {
      if (!datasources[query.datasource]) continue;
      const options = datasourceQuery(query, time, { datasources, getNow: Date.now, source: widget.title });
      void queryClient.query(options).catch(noop);
    }
  }
}
