import userEvent from '@testing-library/user-event';
import { RouterProvider, useSearch } from '@tanstack/react-router';
import { lazy } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { act, render, renderHook, screen, waitFor, within } from '@/testing/render';
import { useDensity } from '@/lib/useDensity';
import type { DataFrame } from '@/core/data/DataFrame';
import { AppError } from '@/core/errors/AppError';
import type { DatasourcePlugin, QueryContext } from '@/plugins/DatasourcePlugin';
import { defineWidget, type WidgetProps } from '@/plugins/WidgetPlugin';
import type { TimeRange } from '@/core/time/timeRange';
import type { Dashboard } from '@/core/dashboard/dashboardSchema';
import { testDashboard } from '@/testing/fixtures/dashboards';
import { createTestRouter } from '@/testing/TestRouter';
import { PluginsContext, type Plugins } from '@/plugins/usePlugins';
import { DashboardProvider } from '../state/DashboardProvider';
import { createDashboardStore, type DashboardStore } from '../state/createDashboardStore';
import type { useEffectiveTime } from '../state/useEffectiveTime';
import { DashboardGrid } from './DashboardGrid';

/** How often each tile rendered: `useEffectiveTime` runs once per tile render. */
const { tileRenders } = vi.hoisted(() => ({ tileRenders: new Map<string, number>() }));
vi.mock('../state/useEffectiveTime', async (importOriginal) => {
  const original = await importOriginal<{ useEffectiveTime: typeof useEffectiveTime }>();
  return {
    useEffectiveTime: (...args: Parameters<typeof original.useEffectiveTime>) => {
      tileRenders.set(args[0], (tileRenders.get(args[0]) ?? 0) + 1);
      return original.useEffectiveTime(...args);
    },
  };
});

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
  return <p>{frames.map((frame) => frame.name).join(', ')}</p>;
}

/** A widget with a text field, as a filter in a table would be. */
const fieldWidget = defineWidget({
  type: 'field',
  name: 'Field',
  defaultSize: { w: 6, h: 3 },
  isTimeAware: false,
  optionsSchema: z.object({}),
  component: lazy(async () => ({ default: () => <input aria-label="Filter" /> })),
  skeleton: <p>Loading</p>,
});

const nameWidget = defineWidget({
  type: 'name',
  name: 'Name',
  defaultSize: { w: 6, h: 3 },
  isTimeAware: true,
  optionsSchema: z.object({}),
  component: lazy(async () => ({ default: FrameName })),
  skeleton: <p>Loading</p>,
});

/** Answers each query only when the test releases it: one frame named after the spec and the range. */
function deferredDatasource() {
  const waiting = new Map<string, (frames: DataFrame[]) => void>();
  const query = vi.fn(
    (spec: unknown, ctx: QueryContext) =>
      new Promise<DataFrame[]>((resolve) => waiting.set(`${String(spec)} ${ctx.raw.from}`, resolve)),
  );
  const release = (spec: string, from: string) =>
    act(async () => waiting.get(`${spec} ${from}`)?.([{ name: `${spec} ${from}`, length: 0, fields: [] }]));
  const datasource: DatasourcePlugin = { type: 'deferred', name: 'Deferred', isTimeAware: true, query };
  return { datasource, query, release };
}

const brokenDatasource: DatasourcePlugin = {
  type: 'broken',
  name: 'Broken',
  isTimeAware: true,
  query: async () => {
    throw new AppError('datasource', 'The broken source failed.', { isRetryable: false });
  },
};

/**
 * The fixture with a deferred-data widget in `a`, an unknown widget type in `b`, `c` asking the same
 * query as `a`, and `d` with one deferred query and one that fails.
 */
const dashboard: Dashboard = {
  ...testDashboard(),
  widgets: {
    a: { type: 'name', title: 'Revenue', options: {}, queries: [{ datasource: 'deferred', spec: 'a' }] },
    b: { type: 'nope', title: 'Regions', options: {}, queries: [] },
    c: {
      type: 'name',
      title: 'Revenue again',
      options: {},
      queries: [{ datasource: 'deferred', spec: 'a' }],
    },
    d: {
      type: 'name',
      title: 'Mixed',
      options: {},
      queries: [
        { datasource: 'deferred', spec: 'd' },
        { datasource: 'broken', spec: {} },
      ],
    },
    e: { type: 'field', title: 'Filtered', options: {}, queries: [] },
  },
  layouts: {
    lg: [
      { i: 'a', x: 0, y: 0, w: 6, h: 3 },
      { i: 'b', x: 6, y: 0, w: 6, h: 3 },
      { i: 'c', x: 0, y: 3, w: 6, h: 3 },
      { i: 'd', x: 6, y: 3, w: 6, h: 3 },
      { i: 'e', x: 0, y: 6, w: 6, h: 3 },
    ],
  },
};

const day: TimeRange = { from: 'now-24h', to: 'now' };

/** The grid as the page has it: the dashboard range from the URL's `from`, viewers' overrides in `wt`. */
function Page({ plugins, store }: { plugins: Plugins; store: DashboardStore }) {
  const from = useSearch({ strict: false, select: (search) => search.from ?? day.from });
  const isDataActive = useSearch({ strict: false, select: (search) => search.view === undefined });
  return (
    <PluginsContext value={plugins}>
      <DashboardProvider dashboard={dashboard} store={store}>
        <DashboardGrid
          range={{ from, to: 'now' }}
          timeZone="UTC"
          isEditing={false}
          isDataActive={isDataActive}
        />
      </DashboardProvider>
    </PluginsContext>
  );
}

function renderGrid() {
  const { datasource, query, release } = deferredDatasource();
  const plugins: Plugins = {
    widgets: { name: nameWidget, field: fieldWidget },
    datasources: { deferred: datasource, broken: brokenDatasource },
  };
  const store = createDashboardStore(dashboard, { shouldPersist: false });
  const router = createTestRouter({ page: <Page plugins={plugins} store={store} /> });
  render(<RouterProvider router={router} />);
  /** Opens the dashboard at these search params, as a link or back and forward would. */
  const go = (search: string) => act(async () => router.history.push(`/dashboards/sales?${search}`));
  return { query, release, go, store, router };
}

const wt = (overrides: object) => `wt=${encodeURIComponent(JSON.stringify(overrides))}`;

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
    const { query, release, go } = renderGrid();
    const tile = await screen.findByRole('region', { name: 'Revenue' });
    enter(tile);
    await waitFor(() => expect(query).toHaveBeenCalledTimes(1));
    await release('a', 'now-24h');
    expect(await screen.findByText('a now-24h')).toBeInTheDocument();

    await go('from=now-7d');
    await waitFor(() => expect(query).toHaveBeenCalledTimes(2));
    expect(screen.getByText('a now-24h')).toBeInTheDocument();
    expect(within(tile).queryByText('Loading')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Revenue' })).toBe(tile);

    await release('a', 'now-7d');
    expect(await screen.findByText('a now-7d')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Revenue' })).toBe(tile);
  });

  it('makes one request when two widgets ask the same query', async () => {
    const { query, release } = renderGrid();
    enter(await screen.findByRole('region', { name: 'Revenue' }));
    enter(screen.getByRole('region', { name: 'Revenue again' }));
    await release('a', 'now-24h');
    expect(
      await within(screen.getByRole('region', { name: 'Revenue again' })).findByText('a now-24h'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Revenue' })).getByText('a now-24h'),
    ).toBeInTheDocument();
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('keeps showing the queries that loaded when another query of the widget fails', async () => {
    const { release } = renderGrid();
    const tile = await screen.findByRole('region', { name: 'Mixed' });
    enter(tile);
    await release('d', 'now-24h');
    expect(await within(tile).findByText('d now-24h')).toBeInTheDocument();
    expect(
      await within(tile).findByRole('button', { name: "Some of this widget's data could not be loaded" }),
    ).toBeInTheDocument();
  });

  it("applies a viewer's override to that widget's queries, and re-renders only its tile", async () => {
    const { query, release, go } = renderGrid();
    const tile = await screen.findByRole('region', { name: 'Revenue' });
    enter(tile);
    await release('a', 'now-24h');
    expect(await within(tile).findByText('a now-24h')).toBeInTheDocument();
    const before = new Map(tileRenders);

    await go(wt({ a: { mode: 'shift', by: '1w' } }));
    await waitFor(() => expect(query).toHaveBeenCalledTimes(2));
    const [first, second] = query.mock.calls.map(([, ctx]) => ctx.range.to.getTime());
    expect(first! - second!).toBe(7 * 86_400_000); // the same window, a week earlier
    expect(tileRenders.get('a')).toBeGreaterThan(before.get('a')!);
    for (const id of ['b', 'c', 'd']) expect(tileRenders.get(id), id).toBe(before.get(id));
  });

  it('makes no request while another widget is full screen, and catches up after', async () => {
    const { query, go } = renderGrid();
    const tile = await screen.findByRole('region', { name: 'Revenue' });
    await go('view=b');
    enter(tile);
    await go('view=b&from=now-7d');
    expect(query).not.toHaveBeenCalled();

    await go('from=now-7d');
    await waitFor(() => expect(query).toHaveBeenCalledTimes(1));
    expect(query.mock.calls[0]![1].raw.from).toBe('now-7d');
  });

  it('spaces tiles by the density, keeping every tile in its row and the document unchanged', async () => {
    const { store } = renderGrid();
    const tile = await screen.findByRole('region', { name: 'Revenue again' });
    const item = tile.closest<HTMLElement>('.react-grid-item')!;
    // RGL places a tile `row × (row height + gap)` from the top.
    const rowAt = (gap: number) =>
      Number(/translate\([^,]+,\s*([\d.]+)px\)/.exec(item.style.transform)?.[1]) / (40 + gap);
    const row = rowAt(16);
    expect(row).toBeGreaterThan(0);
    const layouts = store.getState().doc.layouts;

    const density = renderHook(() => useDensity());
    act(() => density.result.current[1]('compact'));
    await waitFor(() => expect(rowAt(10)).toBe(row));
    expect(store.getState().doc.layouts).toBe(layouts);
    expect(store.getState().isDirty).toBe(false);
  });

  it('takes a shortcut on the widget with focus, but not while typing in a field', async () => {
    const { router } = renderGrid();
    const user = userEvent.setup();
    const tile = await screen.findByRole('region', { name: 'Filtered' });
    enter(tile);
    await user.click(await within(tile).findByRole('textbox', { name: 'Filter' }));
    await user.keyboard('v');
    expect(router.state.location.search).not.toHaveProperty('view');

    within(tile).getByRole('button', { name: 'Actions for Filtered' }).focus();
    await user.keyboard('v');
    await waitFor(() => expect(router.state.location.search).toMatchObject({ view: 'e' }));
  });

  it('shows an error in the tile for a widget type the plugins does not have', async () => {
    renderGrid();
    const tile = await screen.findByRole('region', { name: 'Regions' });
    enter(tile);
    expect(await screen.findByText('No widget of type "nope".')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Revenue' })).toBeInTheDocument();
  });
});
