import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@/test/render';
import { ShellProvider } from '../ShellProvider';
import type { ShellInit } from '../store';
import { Sidebar } from './Sidebar';

function renderAt(path: string, compact = false, init: ShellInit = {}) {
  const rootRoute = createRootRoute({
    component: () => (
      <ShellProvider
        initialState={{
          narrow: false,
          ...init,
          sidebar: { mode: compact ? 'compact' : 'expanded', ...init.sidebar },
        }}
      >
        <Sidebar />
      </ShellProvider>
    ),
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  return render(<RouterProvider router={router} />);
}

describe('Sidebar active states', () => {
  it('marks the current child as selected and its parent as child-active', async () => {
    renderAt('/dashboards/sales');
    const child = await screen.findByRole('link', { name: 'Sales overview' });
    expect(child).toHaveAttribute('data-active');

    const parent = screen.getByRole('button', { name: /Dashboards/ });
    expect(parent).toHaveAttribute('data-child-active');
    expect(parent).not.toHaveAttribute('data-active');
  });

  it('marks a leaf link active on its own route and nested paths', async () => {
    renderAt('/datasources');
    expect(await screen.findByRole('link', { name: 'Data sources' })).toHaveAttribute('data-active');
    expect(screen.getByRole('button', { name: /Dashboards/ })).not.toHaveAttribute('data-child-active');
  });

  it('renders icon-only links with accessible names in compact mode', async () => {
    renderAt('/dashboards/ops', true);
    const link = await screen.findByRole('link', { name: 'Dashboards' });
    expect(link).toHaveAttribute('data-child-active');
    expect(screen.queryByText('Sales overview')).not.toBeInTheDocument();
  });
});

describe('Sidebar footer', () => {
  it('shows the dock toggle before the menu button when expanded', async () => {
    renderAt('/');
    const menu = await screen.findByRole('button', { name: 'Sidebar menu' });
    const dock = screen.getByRole('button', { name: 'Undock panel' });
    // Dock toggle comes first, the menu sits in the trailing position.
    expect(dock.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(menu);
    expect(await screen.findByRole('menuitem', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Collapse to icons' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Hide sidebar' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Undock sidebar' })).not.toBeInTheDocument();
  });

  it('keeps only the menu button when compact and moves undocking into the menu', async () => {
    renderAt('/', true);
    const menu = await screen.findByRole('button', { name: 'Sidebar menu' });
    expect(screen.queryByRole('button', { name: 'Undock panel' })).not.toBeInTheDocument();

    fireEvent.click(menu);
    expect(await screen.findByRole('menuitem', { name: 'Expand sidebar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Hide sidebar' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Undock sidebar' })).toBeInTheDocument();
  });

  it('keeps only the menu button on narrow viewports', async () => {
    renderAt('/', false, { narrow: true });
    expect(await screen.findByRole('button', { name: 'Sidebar menu' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dock panel/i })).not.toBeInTheDocument();
  });
});
