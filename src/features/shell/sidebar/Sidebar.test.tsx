import { createMemoryHistory, createRootRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/render';
import { ShellProvider } from '../ShellProvider';
import { Sidebar } from './Sidebar';

function renderAt(path: string, compact = false) {
  const rootRoute = createRootRoute({
    component: () => (
      <ShellProvider initialState={{ narrow: false, sidebar: { mode: compact ? 'compact' : 'expanded' } }}>
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
