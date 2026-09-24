import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router';
import type { ReactNode } from 'react';
import type { ContextTab } from '@/components/layouts/shell/model/contextTabs';

/**
 * Minimal router for stories: a root that renders `wrap(<Outlet />)` and a catch-all page.
 * Lets chrome components use Link, useRouterState and staticData tabs outside the app router.
 */
export function StoryRouter({
  path = '/dashboards/sales',
  wrap,
  page,
  contextTabs,
}: {
  path?: string;
  wrap: (outlet: ReactNode) => ReactNode;
  page?: ReactNode;
  contextTabs?: ContextTab[];
}) {
  const root = createRootRoute({ component: () => <>{wrap(<Outlet />)}</> });
  const catchAll = createRoute({
    getParentRoute: () => root,
    path: '$',
    staticData: { contextTabs },
    component: () => <>{page}</>,
  });
  const router = createRouter({
    routeTree: root.addChildren([catchAll]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
