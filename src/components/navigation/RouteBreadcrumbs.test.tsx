import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@/testing/render';
import { RouteBreadcrumbs } from './RouteBreadcrumbs';

function Page({ title }: { title: string }) {
  return (
    <>
      <RouteBreadcrumbs />
      <h1>{title}</h1>
    </>
  );
}

/** Same shape as the app: a `/dashboards` layout route with the list and a dashboard under it. */
function renderAt(path: string) {
  const root = createRootRoute({ component: Outlet });
  const dashboards = createRoute({
    getParentRoute: () => root,
    path: 'dashboards',
    staticData: { crumb: 'Dashboards' },
  });
  const list = createRoute({
    getParentRoute: () => dashboards,
    path: '/',
    component: () => <Page title="Dashboards" />,
  });
  const view = createRoute({
    getParentRoute: () => dashboards,
    path: '$id',
    loader: () => ({ title: 'Sales overview' }),
    staticData: { crumb: (data) => (data as { title?: string } | undefined)?.title },
    component: () => <Page title="Sales overview" />,
  });
  const router = createRouter({
    routeTree: root.addChildren([dashboards.addChildren([list, view])]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  render(<RouterProvider router={router} />);
}

describe('RouteBreadcrumbs', () => {
  it('links the parents and marks the current page', async () => {
    renderAt('/dashboards/sales');
    const nav = await screen.findByRole('navigation', { name: 'Breadcrumb' });

    const parent = screen.getByRole('link', { name: 'Dashboards' });
    expect(nav).toContainElement(parent);
    expect(parent).toHaveAttribute('href', '/dashboards');
    expect(parent).not.toHaveAttribute('aria-current');

    const current = screen.getByText('Sales overview', { selector: '[aria-current="page"]' });
    expect(nav).toContainElement(current);
    expect(current.closest('a')).toBeNull();
  });

  it('renders nothing on a top-level page', async () => {
    renderAt('/dashboards');
    expect(await screen.findByRole('heading', { name: 'Dashboards' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
