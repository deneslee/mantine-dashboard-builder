import { useQueryClient } from '@tanstack/react-query';
import { useDashboardActions } from '../state/useDashboard';
import { dashboardKeys } from './dashboardQueries';

/** Takes a new dashboard `now`, then refetches every widget query on screen against it. */
export function useRefreshAll() {
  const queryClient = useQueryClient();
  const { takeNow } = useDashboardActions();
  return () => {
    takeNow();
    void queryClient.invalidateQueries({ queryKey: dashboardKeys.data });
  };
}
