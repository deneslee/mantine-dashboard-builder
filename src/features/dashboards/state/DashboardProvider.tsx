import { useState, type ReactNode } from 'react';
import type { Dashboard } from '@/core/dashboard/dashboardSchema';
import type { DashboardRepository } from '../data/repository';
import { localRepository } from '../data/dashboardApi';
import { DashboardContext } from './context';
import { createDashboardStore, type DashboardStore } from './createDashboardStore';

/** Key this provider by dashboard id. Stories/tests can supply an isolated store. */
export function DashboardProvider({
  dashboard,
  repository = localRepository,
  store,
  mode = 'view',
  children,
}: {
  dashboard: Dashboard;
  repository?: DashboardRepository;
  store?: DashboardStore;
  mode?: 'view' | 'edit';
  children: ReactNode;
}) {
  const [value] = useState(() => store ?? createDashboardStore(dashboard, repository, mode));
  return <DashboardContext value={value}>{children}</DashboardContext>;
}
