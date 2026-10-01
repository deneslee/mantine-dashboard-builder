import { useState, type ReactNode } from 'react';
import type { Dashboard } from '@/core/dashboard/dashboardSchema';
import { DashboardContext } from './context';
import { createDashboardStore, type DashboardStore } from './createDashboardStore';

/** Key this provider by dashboard id. Stories/tests can supply an isolated store. */
export function DashboardProvider({
  dashboard,
  store,
  mode = 'view',
  children,
}: {
  dashboard: Dashboard;
  store?: DashboardStore;
  mode?: 'view' | 'edit';
  children: ReactNode;
}) {
  const [value] = useState(() => store ?? createDashboardStore(dashboard, { mode }));
  return <DashboardContext value={value}>{children}</DashboardContext>;
}
