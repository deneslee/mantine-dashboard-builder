import { NavigationProgress, nprogress } from '@mantine/nprogress';
import { useRouterState } from '@tanstack/react-router';
import { useEffect } from 'react';

/** Thin top bar while a route transition is loading; the previous page stays visible meanwhile. */
export function RouteProgress() {
  const loading = useRouterState({ select: (s) => s.status === 'pending' });
  useEffect(() => {
    if (loading) nprogress.start();
    else nprogress.complete();
  }, [loading]);
  return <NavigationProgress size={2} />;
}
