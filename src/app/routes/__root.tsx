import type { QueryClient } from '@tanstack/react-query';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { nav } from '@/app/nav';
import { NotFound } from '@/app/NotFound';
import { OfflineBanner } from '@/shell/OfflineBanner';
import { RouteProgress } from '@/shell/RouteProgress';
import { notificationsTab } from '@/features/notifications/notificationsTab';
import { Shell } from '@/shell/Shell';
import { ShellProvider } from '@/shell/ShellProvider';

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Root,
  notFoundComponent: NotFound,
});

/** Context-bar tabs on every route. Features meet here, in the app layer, not inside the shell. */
const globalTabs = [notificationsTab];

function Root() {
  return (
    <ShellProvider nav={nav} globalTabs={globalTabs}>
      <RouteProgress />
      <Shell>
        <OfflineBanner />
        <Outlet />
      </Shell>
    </ShellProvider>
  );
}
