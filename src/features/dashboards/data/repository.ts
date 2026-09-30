import type { Dashboard, DashboardSummary } from '../state/types';

export interface DashboardRepository {
  list(signal?: AbortSignal): Promise<DashboardSummary[]>;
  load(id: string, signal?: AbortSignal): Promise<Dashboard>;
  save(dashboard: Dashboard): Promise<void>;
  remove(id: string): Promise<void>;
}
