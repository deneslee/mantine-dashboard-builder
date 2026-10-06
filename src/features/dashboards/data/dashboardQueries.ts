import { queryOptions } from '@tanstack/react-query';
import { AppError } from '@/core/errors/AppError';
import type { DatasourcePlugin, Query } from '@/plugins/DatasourcePlugin';
import { resolveRange, type TimeRange } from '@/core/time/timeRange';
import { getDashboard, listDashboards } from './dashboardApi';

export const dashboardKeys = {
  all: ['dashboards'] as const,
  detail: (id: string) => ['dashboards', id] as const,
  /** Every datasource query; auto-refresh and the Refresh button invalidate this. */
  data: ['ds'] as const,
};

export const dashboardListQuery = () =>
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

/**
 * One datasource query's frames: the cache unit for widget data. The key is the datasource, its spec
 * and the range as written (`now-24h`), so identical queries in two widgets share one request, and
 * each query fails, retries and is cancelled on its own. "now" is resolved when the query runs, so a
 * refetch moves the window. `source` names the widget in error toasts.
 */
export const datasourceQuery = (
  query: Query,
  range: TimeRange,
  datasources: Record<string, DatasourcePlugin>,
  source: string,
) =>
  queryOptions({
    queryKey: [...dashboardKeys.data, query.datasource, query.spec, range],
    queryFn: ({ signal }) => {
      const resolved = resolveRange(range);
      if (!resolved) throw new AppError('validation', `Invalid time range "${range.from}" to "${range.to}".`);
      const datasource = datasources[query.datasource];
      if (!datasource)
        throw new AppError('validation', `No datasource of type "${query.datasource}".`, {
          isRetryable: false,
        });
      return datasource.query(query.spec, { range: resolved, raw: range }, signal);
    },
    meta: { source },
  });
