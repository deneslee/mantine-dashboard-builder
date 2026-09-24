import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@/testing/render';
import type { DashboardWidget } from '../../model/types';
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

// Light widget kinds: what is under test is the tile, not the chart library.
const widgets: DashboardWidget[] = [
  { id: 'kpis', kind: 'kpis', title: 'Key figures', placement: { x: 0, y: 0, w: 6, h: 3 } },
  { id: 'regions', kind: 'regions', title: 'Regions', placement: { x: 6, y: 0, w: 6, h: 6 } },
];

function renderGrid() {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <DashboardGrid dashboardId="d" widgets={widgets} />
    </QueryClientProvider>,
  );
  const query = (id: string) => client.getQueryCache().find({ queryKey: ['widget', 'd', id] });
  return { query };
}

describe('DashboardGrid', () => {
  beforeEach(() => {
    Observer.all = [];
    vi.stubGlobal('IntersectionObserver', Observer);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders a named tile per widget', async () => {
    renderGrid();
    expect(await screen.findByRole('region', { name: 'Key figures' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Regions' })).toBeInTheDocument();
  });

  it('starts a widget only when its tile comes near the viewport', async () => {
    const { query } = renderGrid();
    const tile = await screen.findByRole('region', { name: 'Key figures' });
    expect(query('kpis')).toBeUndefined();
    expect(query('regions')).toBeUndefined();

    const observer = Observer.all.find((o) => o.target && tile.contains(o.target));
    act(() => observer?.enter());

    await waitFor(() => expect(query('kpis')).toBeDefined());
    expect(query('regions')).toBeUndefined();
  });
});
