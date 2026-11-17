import { IconChartLine } from '@tabler/icons-react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { z } from 'zod';
import type { DataFrame } from '@/core/data/DataFrame';
import type { DatasourcePlugin } from '@/plugins/DatasourcePlugin';
import { PluginsContext, type Plugins } from '@/plugins/usePlugins';
import { defineWidget, lazyWidget } from '@/plugins/WidgetPlugin';
import { testDashboard, testLoaded } from '@/testing/fixtures/dashboards';
import { render, screen, waitFor } from '@/testing/render';
import { TestRouter } from '@/testing/TestRouter';
import { DashboardProvider } from '../state/DashboardProvider';
import { WidgetTile } from './WidgetTile';

/** Every tile is in view at once. */
class InView {
  private readonly callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as never);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

const frame: DataFrame = { length: 1, fields: [{ name: 'n', type: 'number', values: [1] }] };

describe('WidgetTile', () => {
  afterEach(() => vi.unstubAllGlobals());

  it("requests the widget's code before its data resolves", async () => {
    vi.stubGlobal('IntersectionObserver', InView);
    let resolveData: (frames: DataFrame[]) => void = () => {};
    const runQuery = vi.fn(() => new Promise<DataFrame[]>((resolve) => (resolveData = resolve)));
    const loadCode = vi.fn(async () => ({ default: () => <p>Drawn</p> }));
    const datasource: DatasourcePlugin = { id: 'x', name: 'X', isTimeAware: true, query: runQuery };
    const widget = defineWidget({
      type: 'chart',
      name: 'Chart',
      description: '',
      icon: IconChartLine,
      queryTypes: 'any',
      defaultSize: { w: 6, h: 3 },
      isTimeAware: true,
      optionsSchema: z.object({}),
      component: lazyWidget(loadCode),
      skeleton: <p>Loading</p>,
    });
    const plugins: Plugins = {
      widgets: { chart: widget },
      datasources: { x: datasource },
      types: {},
      recordProviders: {},
      panels: {},
      actions: {},
      build: { catalog: [] },
    };
    const dashboard = testDashboard();
    dashboard.widgets.a!.queries = [{ datasource: 'x', spec: {} }];
    const range = { from: 'now-24h', to: 'now' };
    render(
      <TestRouter
        page={
          <PluginsContext value={plugins}>
            <DashboardProvider dashboard={testLoaded(dashboard)}>
              <WidgetTile id="a" range={range} timeZone="UTC" />
            </DashboardProvider>
          </PluginsContext>
        }
      />,
    );

    await waitFor(() => expect(runQuery).toHaveBeenCalledOnce());
    // The data is still on its way, and the code is already requested.
    expect(loadCode).toHaveBeenCalledOnce();
    resolveData([frame]);
    expect(await screen.findByText('Drawn')).toBeVisible();
    expect(loadCode).toHaveBeenCalledOnce();
  });
});
