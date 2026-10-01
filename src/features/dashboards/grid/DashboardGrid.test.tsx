import { lazy } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { act, render, screen, waitFor } from '@/testing/render';
import type { DataFrame } from '@/core/data/DataFrame';
import type { DatasourcePlugin, QueryContext } from '@/plugins/DatasourcePlugin';
import { defineWidget, type WidgetProps } from '@/plugins/WidgetPlugin';
import { resolveLayouts } from '@/core/dashboard/layout';
import type { TimeRange } from '@/core/time/timeRange';
import type { Dashboard } from '../state/types';
import { PluginsContext, type Plugins } from '@/plugins/usePlugins';
import { DashboardProvider } from '../state/DashboardProvider';
import { createDashboardStore } from '../state/createDashboardStore';
import { localRepository } from '../data/dashboardApi';
import { DashboardGrid } from './DashboardGrid';

/** IntersectionObserver stub that the test drives by hand. */
class Observer {
  static all: Observer[] = [];
  target: Element | null = null;
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    Observer.all.push(this);
  }
  observe(target: Element) {
    this.target = target;
  }
  unobserve() {}
  disconnect() {}
  /** Reports the observed element as near the viewport. */
  enter() {
    const entry = { isIntersecting: true, target: this.target } as IntersectionObserverEntry;
    this.callback([entry], this as unknown as IntersectionObserver);
  }
}

const enter = (tile: HTMLElement) =>
  act(() => Observer.all.find((o) => o.target && tile.contains(o.target))?.enter());

// A fake plugins: what is under test is the tile, not a chart library or a real datasource.
function FrameName({ frames }: WidgetProps<unknown>) {
  return <p>{frames[0]?.name}</p>;
}

const nameWidget = defineWidget({
  type: 'name',
  name: 'Name',
  defaultSize: { w: 6, h: 3 },
  optionsSchema: z.object({}),
  component: lazy(async () => ({ default: FrameName })),
  skeleton: <p>Loading</p>,
});

/** Answers each query only when the test releases it, one answer per range. */
function deferredDatasource() {
  const waiting = new Map<string, (frame: DataFrame) => void>();
  const query = vi.fn(
    (_spec: unknown, ctx: QueryContext) =>
      new Promise<DataFrame>((resolve) => waiting.set(ctx.raw.from, resolve)),
  );
  const release = (from: string) =>
    act(async () => waiting.get(from)?.({ name: `frame ${from}`, length: 0, fields: [] }));
  const datasource: DatasourcePlugin = { type: 'deferred', name: 'Deferred', query };
  return { datasource, query, release };
}

const dashboard: Dashboard = {
  version: 1,
  id: 'test',
  title: 'Test',
  description: '',
  updatedAt: '2026-09-30',
  tags: [],
  variables: [],
  timeRange: { from: 'now-24h', to: 'now' },
  refresh: 'off',
  widgets: {
    a: {
      id: 'a',
      type: 'name',
      title: 'Revenue',
      options: {},
      queries: [{ datasource: 'deferred', spec: 'a' }],
    },
    b: { id: 'b', type: 'nope', title: 'Regions', options: {}, queries: [] },
  },
  layouts: resolveLayouts({
    lg: [
      { i: 'a', x: 0, y: 0, w: 6, h: 3 },
      { i: 'b', x: 6, y: 0, w: 6, h: 3 },
    ],
  }),
};

const day: TimeRange = { from: 'now-24h', to: 'now' };
const week: TimeRange = { from: 'now-7d', to: 'now' };

function renderGrid() {
  const { datasource, query, release } = deferredDatasource();
  const plugins: Plugins = {
    widgets: { name: nameWidget },
    datasources: { deferred: datasource },
  };
  const store = createDashboardStore(dashboard, localRepository, 'view', false);
  const ui = (range: TimeRange) => (
    <PluginsContext value={plugins}>
      <DashboardProvider dashboard={dashboard} store={store}>
        <DashboardGrid range={range} />
      </DashboardProvider>
    </PluginsContext>
  );
  const { rerender } = render(ui(day));
  return { query, release, setRange: (range: TimeRange) => rerender(ui(range)) };
}

describe('DashboardGrid', () => {
  beforeEach(() => {
    Observer.all = [];
    vi.stubGlobal('IntersectionObserver', Observer);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders a named tile per widget', async () => {
    renderGrid();
    expect(await screen.findByRole('region', { name: 'Revenue' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Regions' })).toBeInTheDocument();
  });

  it('starts a widget only when its tile comes near the viewport', async () => {
    const { query } = renderGrid();
    const tile = await screen.findByRole('region', { name: 'Revenue' });
    expect(query).not.toHaveBeenCalled();

    enter(tile);
    await waitFor(() => expect(query).toHaveBeenCalledTimes(1));
    expect(query).toHaveBeenCalledWith('a', expect.objectContaining({ raw: day }), expect.anything());
  });

  it('keeps the tile and its data on screen while a new range loads', async () => {
    const { query, release, setRange } = renderGrid();
    const tile = await screen.findByRole('region', { name: 'Revenue' });
    enter(tile);
    await waitFor(() => expect(query).toHaveBeenCalledTimes(1));
    await release('now-24h');
    expect(await screen.findByText('frame now-24h')).toBeInTheDocument();

    setRange(week);
    await waitFor(() => expect(query).toHaveBeenCalledTimes(2));
    expect(screen.getByText('frame now-24h')).toBeInTheDocument();
    expect(screen.queryByText('Loading')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Revenue' })).toBe(tile);

    await release('now-7d');
    expect(await screen.findByText('frame now-7d')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Revenue' })).toBe(tile);
  });

  it('shows an error in the tile for a widget type the plugins does not have', async () => {
    renderGrid();
    const tile = await screen.findByRole('region', { name: 'Regions' });
    enter(tile);
    expect(await screen.findByText('No widget of type "nope".')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Revenue' })).toBeInTheDocument();
  });
});
