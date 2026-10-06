import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import type { DataFrame } from '@/core/data/DataFrame';
import type { TimeRange } from '@/core/time/timeRange';
import type { Query } from '@/plugins/DatasourcePlugin';
import { usePlugins } from '@/plugins/usePlugins';
import { datasourceQuery } from './dashboardQueries';

export interface WidgetData {
  /**
   * Every query's frames, in query order, leaving out queries that failed without data. While new
   * keys load (a range change, applied queries), the last complete result; `undefined` before the
   * first one, and when every query failed.
   */
  frames: DataFrame[] | undefined;
  /** The first error. Without frames the tile shows it; with frames the header warns. */
  error: unknown;
  /** Some query failed, on its first load or a refetch. */
  hasFailed: boolean;
  isFetching: boolean;
  /** Refetches every query; settles when they all have. */
  refetch: () => Promise<unknown>;
}

/** A module function, so `useQueries` re-runs it only when a query's result changes. */
function combine(results: UseQueryResult<DataFrame[]>[]) {
  const isLoading = results.some((result) => result.isPending);
  const hasData = results.length === 0 || results.some((result) => result.data !== undefined);
  return {
    frames: isLoading || !hasData ? undefined : results.flatMap((result) => result.data ?? []),
    isLoading,
    error: results.find((result) => result.error)?.error,
    hasFailed: results.some((result) => result.isError),
    isFetching: results.some((result) => result.isFetching),
    refetch: () => Promise.all(results.map((result) => result.refetch())),
  };
}

/**
 * A widget's data: one cache entry per datasource query ([07 §6]), combined. Runs nothing until
 * `isEnabled` (the tile came near the viewport).
 */
export function useWidgetData(
  queries: Query[],
  range: TimeRange,
  { isEnabled, source }: { isEnabled: boolean; source: string },
): WidgetData {
  const { datasources } = usePlugins();
  const { isLoading, ...data } = useQueries({
    queries: queries.map((query) => ({
      ...datasourceQuery(query, range, datasources, source),
      enabled: isEnabled,
    })),
    combine,
  });
  // `useQueries` makes a new observer per key, so it can't show the previous range's data while the
  // next loads (no `keepPreviousData`). The widget keeps its last complete frames instead, so a range
  // change never flashes the skeleton.
  const [kept, setKept] = useState(data.frames);
  if (data.frames && data.frames !== kept) setKept(data.frames);
  return { ...data, frames: data.frames ?? (isLoading ? kept : undefined) };
}
