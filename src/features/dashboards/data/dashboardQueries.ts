import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { AppError } from '@/core/errors/AppError';
import type { DatasourceDefinition, Query } from '@/plugins/DatasourcePlugin';
import { resolveRange, type RawRange } from '@/core/time/timeRange';
import { getDashboard, listDashboards } from './dashboardApi';

export const dashboardKeys = {
  all: ['dashboards'] as const,
  detail: (id: string) => ['dashboards', id] as const,
  /** Every widget query; auto-refresh and the Refresh button invalidate this. */
  data: ['ds'] as const,
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

/**
 * A widget's data: all its queries, one frame each. One query per widget (not per datasource
 * query), because `keepPreviousData` needs the same observer across a key change, and `useQueries`
 * makes a new one per key. The key holds the range as written (`now-24h`), so it stays the same
 * between renders; "now" is resolved when the query runs, so a refetch moves the window. Widgets
 * with the same queries share one request.
 */
export const widgetDataQuery = (
  queries: Query[],
  range: RawRange,
  datasources: Record<string, DatasourceDefinition>,
  source: string,
) =>
  queryOptions({
    queryKey: [...dashboardKeys.data, queries, range],
    queryFn: ({ signal }) => {
      const resolved = resolveRange(range);
      if (!resolved) throw new AppError('validation', `Invalid time range "${range.from}" to "${range.to}".`);
      return Promise.all(
        queries.map((query) => {
          const datasource = datasources[query.datasource];
          if (!datasource)
            throw new AppError('validation', `No datasource of type "${query.datasource}".`, {
              retryable: false,
            });
          return datasource.query(query.spec, { range: resolved, raw: range }, signal);
        }),
      );
    },
    // A range change keeps showing the old data until the new data arrives: no skeleton flash.
    placeholderData: keepPreviousData,
    // First-load errors go to the tile's error boundary; a failed refetch keeps the old data (and toasts).
    throwOnError: (_error, q) => q.state.data === undefined,
    meta: { source },
  });
