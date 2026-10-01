import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@/testing/render';
import { dimensions } from '@/ui/tokens/dimensions';
import { Shell } from './Shell';
import { ShellProvider } from './ShellProvider';
import { createShellStore, type ShellInit } from './createShellStore';

function renderShell(init: ShellInit = {}) {
  const store = createShellStore({ isNarrow: false, ...init }, false);
  const rootRoute = createRootRoute({
    component: () => (
      <ShellProvider store={store}>
        <Shell>
          <p>Page</p>
        </Shell>
      </ShellProvider>
    ),
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  render(<RouterProvider router={router} />);
  return store;
}

/** Handles in DOM order: sidebar | main, main | context bar. */
const handles = async () => {
  const all = await screen.findAllByRole('separator');
  return { sidebar: all[0]!, context: all[1]! };
};

describe('Shell pane widths', () => {
  // The splitter measures its container for keyboard steps; jsdom has no layout.
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 1280,
      height: 800,
    } as DOMRect);
  });
  afterEach(() => vi.restoreAllMocks());

  it('saves keyboard resizes, so the next toggle does not snap back', async () => {
    const store = renderShell({ sidebar: { width: 260 } });
    const { sidebar } = await handles();

    fireEvent.keyDown(sidebar, { key: 'ArrowRight' });
    expect(store.getState().sidebar.width).toBe(268);

    fireEvent.keyDown(sidebar, { key: 'ArrowRight', shiftKey: true });
    expect(store.getState().sidebar.width).toBe(308);
  });

  it('resets a panel to its default width on double-click', async () => {
    const store = renderShell({
      sidebar: { width: 320 },
      contextBar: { isOpen: true, width: 480 },
    });
    const { sidebar, context } = await handles();

    fireEvent.doubleClick(sidebar);
    expect(store.getState().sidebar.width).toBe(dimensions.shell.sidebar.expanded);

    fireEvent.doubleClick(context);
    expect(store.getState().contextBar.width).toBe(dimensions.shell.contextBar.default);
  });

  it('leaves the stored width alone when the sidebar is the compact rail', async () => {
    const store = renderShell({ sidebar: { mode: 'compact', width: 320 } });
    const { sidebar } = await handles();

    fireEvent.doubleClick(sidebar);
    expect(store.getState().sidebar.width).toBe(320);
  });
});

describe('Context button', () => {
  it('looks selected while the context bar is docked open', async () => {
    renderShell({ contextBar: { isOpen: true } });
    // `pressed` tells the navbar toggle apart from the panel's own close button.
    const button = await screen.findByRole('button', { name: 'Close context panel', pressed: true });
    expect(button).toHaveAttribute('data-active');
  });

  it('does not look selected while the context bar is an open drawer', async () => {
    renderShell({ contextBar: { isDocked: false, isDrawerOpen: true } });
    const button = await screen.findByRole('button', {
      name: 'Close context panel',
      pressed: true,
      hidden: true,
    });
    expect(button).not.toHaveAttribute('data-active');
  });
});
