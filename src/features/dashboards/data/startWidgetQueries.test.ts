import { describe, expect, it, vi } from 'vite-plus/test';
import { createQueryClient } from '@/app/queryClient';
import type { Dashboard } from '@/core/dashboard/dashboardSchema';
import type { DatasourcePlugin } from '@/plugins/DatasourcePlugin';
import type { WidgetPlugin } from '@/plugins/WidgetPlugin';
import { testDashboard } from '@/testing/fixtures/dashboards';
import { FIRST_SCREEN_ROWS, getVisibleOnLoad, startWidgetQueries } from './startWidgetQueries';

describe('getVisibleOnLoad', () => {
  it('yields the widgets whose top is on the first screen, in reading order', () => {
    const layout = [
      { i: 'below', x: 0, y: FIRST_SCREEN_ROWS, w: 12, h: 4 },
      { i: 'right', x: 6, y: 0, w: 6, h: 4 },
      { i: 'last', x: 0, y: FIRST_SCREEN_ROWS - 1, w: 12, h: 8 },
      { i: 'left', x: 0, y: 0, w: 6, h: 4 },
    ];
    expect(getVisibleOnLoad(layout)).toEqual(['left', 'right', 'last']);
  });

  it('is about 900 px of 40 px rows', () => {
    expect(FIRST_SCREEN_ROWS).toBe(23);
  });
});

/** `a` and `b` on the first screen, `c` below it; each with one query. */
function setup() {
  const dashboard: Dashboard = testDashboard();
  const query = (n: number) => ({ datasource: 'x', spec: { n } });
  dashboard.widgets.a!.queries = [query(1)];
  dashboard.widgets.b!.queries = [query(2), { datasource: 'connection', spec: {} }];
  dashboard.widgets.c = { type: 'kpi', title: 'Third', options: {}, queries: [query(3)] };
  dashboard.layouts.lg.push({ i: 'c', x: 0, y: FIRST_SCREEN_ROWS, w: 12, h: 3 });
  // Never settles: whatever the caller does, it can't have waited for it.
  const runQuery = vi.fn<DatasourcePlugin['query']>(() => new Promise<never>(() => {}));
  const datasource: DatasourcePlugin = { id: 'x', name: 'X', isTimeAware: true, query: runQuery };
  const preload = vi.fn(() => Promise.resolve());
  const widget = (type: string) => ({ type, component: { preload } }) as unknown as WidgetPlugin;
  const plugins = { widgets: { chart: widget('chart'), kpi: widget('kpi') }, datasources: { x: datasource } };
  return { dashboard, runQuery, preload, plugins, queryClient: createQueryClient() };
}

describe('startWidgetQueries', () => {
  it("starts the first screen's queries and code without waiting for them", () => {
    const { dashboard, runQuery, preload, plugins, queryClient } = setup();
    const returned: unknown = startWidgetQueries(queryClient, dashboard, {}, plugins);
    expect(returned).toBeUndefined();
    expect(runQuery.mock.calls.map(([spec]) => spec)).toEqual([{ n: 1 }, { n: 2 }]);
    // Widgets `a` and `b`; a datasource outside the static plugins (a connection) is left to its tile.
    expect(preload).toHaveBeenCalledTimes(2);
    const fetching = queryClient.getQueryCache().findAll({ fetchStatus: 'fetching' });
    expect(fetching).toHaveLength(2);
  });

  it('uses the URL range, so the tiles find the same keys', () => {
    const { dashboard, runQuery, plugins, queryClient } = setup();
    startWidgetQueries(queryClient, dashboard, { from: 'now-7d', tz: 'UTC' }, plugins);
    const keys = queryClient
      .getQueryCache()
      .findAll()
      .map((entry) => entry.queryKey);
    expect(keys[0]).toEqual(['ds', 'x', { n: 1 }, { from: 'now-7d', to: 'now' }, [], 'UTC']);
    expect(runQuery).toHaveBeenCalledTimes(2);
  });

  it('starts only the full-screen widget, and nothing in edit mode', () => {
    const { dashboard, runQuery, plugins, queryClient } = setup();
    startWidgetQueries(queryClient, dashboard, { mode: 'edit' }, plugins);
    expect(runQuery).not.toHaveBeenCalled();
    startWidgetQueries(queryClient, dashboard, { view: 'c' }, plugins);
    expect(runQuery.mock.calls.map(([spec]) => spec)).toEqual([{ n: 3 }]);
  });
});
