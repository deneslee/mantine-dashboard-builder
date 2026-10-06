import { useSearch } from '@tanstack/react-router';
import { resolveWidgetTime, type EffectiveTime, type TimeRange } from '@/core/time/timeRange';
import { useDashboard } from './useDashboard';

/**
 * A widget's time ([07 §1]): its overrides over the dashboard range, in the dashboard's time zone.
 * Each tile reads only its own overrides (URL `wt[id]`, the saved `time`), so changing one re-renders
 * one tile. In edit mode the URL's overrides don't apply: the author sees what Save keeps.
 */
export function useEffectiveTime(
  id: string,
  dashboard: TimeRange,
  timeZone: string,
  { isEditing }: { isEditing: boolean },
): EffectiveTime {
  const saved = useDashboard((state) => state.doc.widgets[id]?.time);
  const viewer = useSearch({ strict: false, select: (search) => search.wt?.[id] });
  return { ...resolveWidgetTime(dashboard, saved, isEditing ? undefined : viewer), timeZone };
}
