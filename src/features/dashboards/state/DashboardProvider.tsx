import { useState, type ReactNode } from 'react';
import type { Dashboard } from '@/core/dashboard/dashboardSchema';
import { DashboardContext } from './context';
import { createDashboardStore, type DashboardStore } from './createDashboardStore';

/** Key this provider by dashboard id. Stories/tests can supply an isolated store. */
export function DashboardProvider({
  dashboard,
  store,
  children,
}: {
  dashboard: Dashboard;
  store?: DashboardStore;
  children: ReactNode;
}) {
  const [value] = useState(() => store ?? createDashboardStore(dashboard));
  return <DashboardContext value={value}>{children}</DashboardContext>;
}
