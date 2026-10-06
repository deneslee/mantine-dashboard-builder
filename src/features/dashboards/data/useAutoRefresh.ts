import { useDocumentVisibility } from '@mantine/hooks';
import { useEffect, useEffectEvent } from 'react';
import { parseRefreshInterval } from '@/core/time/timeRange';

/**
 * One timer for the whole dashboard: every `refresh` it calls `onRefresh` (`useRefreshAll`: a new
 * `now`, then the widget queries refetch). One timer, so every widget moves to the same window
 * (per-query `refetchInterval` would drift). Paused while the tab is hidden; `off` never ticks.
 *
 * Not Mantine's `useInterval`: it restarts itself when its interval changes while running, so
 * switching to `off` (no interval) would leave a 0 ms timer behind.
 */
export function useAutoRefresh(refresh: string, onRefresh: () => void) {
  const visibility = useDocumentVisibility();
  const ms = parseRefreshInterval(refresh);
  const tick = useEffectEvent(onRefresh);

  useEffect(() => {
    if (!ms || visibility !== 'visible') return;
    const timer = window.setInterval(() => tick(), ms);
    return () => window.clearInterval(timer);
  }, [ms, visibility]);
}
