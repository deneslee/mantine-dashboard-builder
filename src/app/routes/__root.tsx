import type { QueryClient } from '@tanstack/react-query';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { NotFound } from '@/components/errors/NotFound';
import { OfflineBanner } from '@/components/errors/OfflineBanner';
import { RouteProgress } from '@/components/feedback/RouteProgress';
import { notificationsTab } from '@/features/notifications/tab';
import { Shell } from '@/components/layouts/shell/Shell';
import { ShellProvider } from '@/components/layouts/shell/ShellProvider';

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
