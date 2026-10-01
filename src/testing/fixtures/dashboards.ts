import { storedDashboardSchema, type Dashboard } from '@/core/dashboard/dashboardSchema';

/** Two widgets side by side on lg, `a` (chart) and `b` (kpi), with no queries. A fresh copy each call. */
export const testDashboard = (): Dashboard => ({
  schemaVersion: 1,
  id: 'test',
  title: 'Test',
  description: '',
  tags: [],
  updatedAt: '2026-09-30T10:00:00Z',
  timeRange: { from: 'now-24h', to: 'now' },
  refresh: 'off',
  variables: [],
  widgets: {
    a: { type: 'chart', title: 'First', options: {}, queries: [] },
    b: { type: 'kpi', title: 'Second', options: {}, queries: [] },
  },
  layouts: {
    lg: [
      { i: 'a', x: 0, y: 0, w: 6, h: 3 },
      { i: 'b', x: 6, y: 0, w: 6, h: 3 },
    ],
  },
});

/** A demo dashboard from `public/data/dashboards/`, read as the app reads it. Stories only: Storybook serves `public/`. */
export async function loadDemoDashboard(id: string): Promise<Dashboard> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/dashboards/${id}.json`);
  return storedDashboardSchema.parse(await response.json());
}
