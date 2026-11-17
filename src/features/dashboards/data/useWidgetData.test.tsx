import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { createQueryClient } from '@/app/queryClient';
import type { DataFrame } from '@/core/data/DataFrame';
import type { DatasourcePlugin, Query } from '@/plugins/DatasourcePlugin';
import { PluginsContext, type Plugins } from '@/plugins/usePlugins';
import { testDashboard } from '@/testing/fixtures/dashboards';
import { act, render, screen } from '@/testing/render';
import { DashboardProvider } from '../state/DashboardProvider';
import { dashboardKeys } from './dashboardQueries';
import { useDatasourceResult, useWidgetData } from './useWidgetData';

const time = { range: { from: 'now-24h', to: 'now' }, shifts: [], timeZone: 'UTC' };
const query: Query = { datasource: 'x', spec: { sql: 'SELECT 1' } };
const frame: DataFrame = { length: 1, fields: [{ name: 'n', type: 'number', values: [1] }] };

function Tile({ name }: { name: string }) {
  const data = useWidgetData([query], time, { isEnabled: true, source: name });
  return <p>{`${name}: ${data.frames ? `${data.frames.length} frame` : 'loading'}`}</p>;
}

/** What Inspect mounts beside a tile that already has its data. */
function Inspect() {
  const { result } = useDatasourceResult(query, time, { source: 'Inspect' });
  return <p>{`Inspect: ${result.data ? `${result.data.frames.length} frame` : 'loading'}`}</p>;
}

function setup() {
  const runQuery = vi.fn(async () => [frame]);
  const datasource: DatasourcePlugin = { id: 'x', name: 'X', isTimeAware: true, query: runQuery };
  const plugins: Plugins = {
    widgets: {},
    datasources: { x: datasource },
    types: {},
    recordProviders: {},
    panels: {},
    actions: {},
    build: { catalog: [] },
  };
  const queryClient = createQueryClient();
  const tree = (hasInspect: boolean) => (
    <PluginsContext value={plugins}>
      <DashboardProvider dashboard={testDashboard()}>
        <Tile name="First" />
        <Tile name="Second" />
        {hasInspect ? <Inspect /> : null}
      </DashboardProvider>
    </PluginsContext>
  );
  const view = render(tree(false), { queryClient });
  return { runQuery, queryClient, openInspect: () => view.rerender(tree(true)) };
}

describe('useWidgetData', () => {
  afterEach(() => vi.useRealTimers());

  it('makes one datasource call for two widgets with the same query', async () => {
    const { runQuery } = setup();
    expect(await screen.findByText('First: 1 frame')).toBeVisible();
    expect(screen.getByText('Second: 1 frame')).toBeVisible();
    expect(runQuery).toHaveBeenCalledTimes(1);
  });

  it('keeps a result fresh on mount and focus, however old, until a refresh', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { runQuery, queryClient, openInspect } = setup();
    await screen.findByText('First: 1 frame');

    vi.setSystemTime(Date.now() + 60 * 60_000);
    openInspect();
    act(() => void window.dispatchEvent(new Event('visibilitychange')));
    expect(screen.getByText('Inspect: 1 frame')).toBeVisible();
    expect(runQuery).toHaveBeenCalledTimes(1);

    // The Refresh button and the refresh timer (`useRefreshAll`).
    await act(() => queryClient.invalidateQueries({ queryKey: dashboardKeys.data }));
    expect(runQuery).toHaveBeenCalledTimes(2);
  });
});
