import { queryOptions } from '@tanstack/react-query';
import { getDashboard, listDashboards } from './client';

export const dashboardKeys = {
  all: ['dashboards'] as const,
  detail: (id: string) => ['dashboards', id] as const,
};

export const dashboardsQuery = () =>
  queryOptions({
    queryKey: dashboardKeys.all,
    queryFn: ({ signal }) => listDashboards(signal),
    meta: { source: 'Dashboards' },
  });

export const dashboardQuery = (id: string) =>
  queryOptions({
    queryKey: dashboardKeys.detail(id),
    queryFn: ({ signal }) => getDashboard(id, signal),
    meta: { source: 'Dashboards' },
    retry: false,
  });
