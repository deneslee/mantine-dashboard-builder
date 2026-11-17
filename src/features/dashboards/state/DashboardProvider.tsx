import { useState, type ReactNode } from 'react';
import type { LoadedDashboard } from '../data/dashboardSource';
import { DashboardContext } from './useDashboard';
import { createDashboardStore, type DashboardStore } from './createDashboardStore';

/**
 * Key this provider by `placeId:id`: a dashboard opened from another place is another store, with
 * its own baseline, draft and revision. Stories/tests can supply an isolated store.
 */
export function DashboardProvider({
  dashboard,
  store,
  children,
}: {
  dashboard: LoadedDashboard;
  store?: DashboardStore;
  children: ReactNode;
}) {
  const [value] = useState(() => store ?? createDashboardStore(dashboard));
  return <DashboardContext value={value}>{children}</DashboardContext>;
}
