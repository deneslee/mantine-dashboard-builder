import { createRouter } from '@tanstack/react-router';
import { NotFound, RouteError } from '@/features/errors';
import { ListSkeleton } from '@/features/loading';
import { routeTree } from '@/routeTree.gen';
import type { QueryClient } from '@tanstack/react-query';

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    // Skeleton only if a route takes >300ms, then keep it at least 500ms to avoid flicker.
    defaultPendingMs: 300,
    defaultPendingMinMs: 500,
    defaultPendingComponent: ListSkeleton,
    defaultErrorComponent: RouteError,
    defaultNotFoundComponent: NotFound,
    scrollRestoration: true,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
