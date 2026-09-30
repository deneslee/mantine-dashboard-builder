import { useDocumentVisibility } from '@mantine/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { dashboardKeys } from './dashboardQueries';
import { refreshMs } from '@/core/time/timeRange';

/**
 * One timer for the whole dashboard: every `refresh` it invalidates the widget queries, and React
 * Query refetches the ones on screen. One timer, so every widget resolves "now" at the same moment
 * (per-query `refetchInterval` would drift). Paused while the tab is hidden; `off` never ticks.
 *
 * Not Mantine's `useInterval`: it restarts itself when its interval changes while running, so
 * switching to `off` (no interval) would leave a 0 ms timer behind.
 */
export function useAutoRefresh(refresh: string) {
  const queryClient = useQueryClient();
  const visibility = useDocumentVisibility();
  const ms = refreshMs(refresh);

  useEffect(() => {
    if (!ms || visibility !== 'visible') return;
    const timer = window.setInterval(
      () => void queryClient.invalidateQueries({ queryKey: dashboardKeys.data }),
      ms,
    );
    return () => window.clearInterval(timer);
  }, [ms, visibility, queryClient]);
}
