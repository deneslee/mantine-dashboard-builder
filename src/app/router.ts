import { createRouter, type RouterHistory } from '@tanstack/react-router';
import { NotFound } from '@/app/NotFound';
import { RouteError } from '@/app/RouteError';
import { ListSkeleton } from '@/ui/components/Skeletons';
import { connectRouter } from '@/lib/sentry/runtime';
import { routeTree } from './routeTree.gen';
import type { QueryClient } from '@tanstack/react-query';

/** Stories pass a memory history and base path '/'; the app uses the browser URL under the deploy base. */
export function createAppRouter(
  queryClient: QueryClient,
  { history, basepath = import.meta.env.BASE_URL }: { history?: RouterHistory; basepath?: string } = {},
) {
  const router = createRouter({
    routeTree,
    history,
    basepath,
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

  connectRouter(router);

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
