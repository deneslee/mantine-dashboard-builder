import type { QueryClient } from '@tanstack/react-query';
import { dashboardKeys } from '@/features/dashboards/data/dashboardQueries';
import { migrateLegacyDashboards } from '@/features/dashboards/data/dashboardApi';
import { onActivePlaceChange } from '@/lib/records/activeRecordProvider';

const started = new WeakSet<QueryClient>();

/**
 * Started once with the query client, before the first route loads:
 * - moves the old browser-only saves into the browser place, then refreshes the dashboards it shows;
 * - when the place in use changes (here or in another tab), refreshes the dashboards *list* for the new
 *   place. Open dashboards are not touched: an editor stays on the place it was opened from.
 */
export function startRecordSync(queryClient: QueryClient) {
  if (started.has(queryClient)) return;
  started.add(queryClient);
  void migrateLegacyDashboards().then((moved) => {
    if (moved > 0) void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
  });
  onActivePlaceChange((place) => {
    void queryClient.invalidateQueries({ queryKey: dashboardKeys.list(place.id) });
  });
}
