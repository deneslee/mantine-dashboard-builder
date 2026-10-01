import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import type { ContextTab } from '@/shell/ContextTab';

interface TestRouterOptions {
  path?: string;
  /** Renders the root; `outlet` is where the catch-all page goes. */
  wrap?: (outlet: ReactNode) => ReactNode;
  page?: ReactNode;
  contextTabs?: ContextTab[];
}

/**
 * A root that renders `wrap(<Outlet />)` and a catch-all page, on a memory history. Lets chrome
 * components use Link, useRouterState and staticData tabs outside the app router.
 */
export function createTestRouter({
  path = '/dashboards/sales',
  wrap = (outlet) => outlet,
  page,
  contextTabs,
}: TestRouterOptions = {}) {
  const root = createRootRoute({ component: () => <>{wrap(<Outlet />)}</> });
  const catchAll = createRoute({
    getParentRoute: () => root,
    path: '$',
    staticData: { contextTabs },
    component: () => <>{page}</>,
  });
  return createRouter({
    routeTree: root.addChildren([catchAll]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
}

/** `createTestRouter` as a component, for stories and tests that don't navigate. */
export function TestRouter(options: TestRouterOptions) {
  const [router] = useState(() => createTestRouter(options));
  return <RouterProvider router={router} />;
}
