import type { QueryClient } from '@tanstack/react-query';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { NotFound, OfflineBanner } from '@/components/errors';
import { RouteProgress } from '@/components/feedback';
import { notificationsTab } from '@/features/notifications';
import { Shell, ShellProvider } from '@/components/layouts/shell';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Root,
  notFoundComponent: NotFound,
});

/** Context-bar tabs on every route. Features meet here, in the app layer, not inside the shell. */
const globalTabs = [notificationsTab];

function Root() {
  return (
    <ShellProvider globalTabs={globalTabs}>
      <RouteProgress />
      <Shell>
        <OfflineBanner />
        <Outlet />
      </Shell>
    </ShellProvider>
  );
}
