import type { QueryClient } from '@tanstack/react-query';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { NotFound, OfflineBanner } from '@/components/errors';
import { RouteProgress } from '@/components/feedback';
import { Shell, ShellProvider } from '@/features/shell';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Root,
  notFoundComponent: NotFound,
});

function Root() {
  return (
    <ShellProvider>
      <RouteProgress />
      <Shell>
        <OfflineBanner />
        <Outlet />
      </Shell>
    </ShellProvider>
  );
}
