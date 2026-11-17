import { createContext, use } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';
import type { LoadedDashboard } from '../data/dashboardSource';
import { resolveDashboardTime, type DashboardSearch, type DashboardTime } from '../dashboardSearch';
import { selectDashboard, type DashboardState, type DashboardStore } from './createDashboardStore';

/** Set by `DashboardProvider`; read only through the hooks below. */
export const DashboardContext = createContext<DashboardStore | null>(null);

function useDashboardStore() {
  const store = use(DashboardContext);
  if (!store) throw new Error('Dashboard hooks need <DashboardProvider>');
  return store;
}

export function useDashboard<T>(selector: (state: DashboardState) => T): T {
  return useStore(useDashboardStore(), selector);
}
export const useDashboardActions = () => useDashboard((state) => state.actions);
export const useWidget = (id: string) => useDashboard((state) => state.doc.widgets[id]);
export function useUndoState() {
  return useStore(
    useDashboardStore().temporal,
    useShallow((state) => ({ canUndo: state.pastStates.length > 0, canRedo: state.futureStates.length > 0 })),
  );
}
/** The dashboard's effective time: the URL's `from`/`to`/`refresh`/`tz`, else the document's defaults. */
export function useDashboardTime(
  search: Pick<DashboardSearch, 'from' | 'to' | 'refresh' | 'tz'>,
): DashboardTime {
  const timeRange = useDashboard((s) => s.doc.timeRange);
  const refresh = useDashboard((s) => s.doc.refresh);
  const timeZone = useDashboard((s) => s.doc.timeZone);
  return resolveDashboardTime({ timeRange, refresh, timeZone }, search);
}
/** Event callbacks read the latest document without subscribing the whole page. */
/** Reads the dashboard's current `now` without subscribing: for query functions, which run later. */
export function useReadNow() {
  const store = useDashboardStore();
  return () => store.getState().now;
}

export function useReadDashboard() {
  const store = useDashboardStore();
  return () => selectDashboard(store.getState());
}

/** What Save last stored (the baseline and its source), read when needed: for updating the query cache. */
export function useReadSaved() {
  const store = useDashboardStore();
  return (): LoadedDashboard => ({ document: store.getState().baseline, source: store.getState().source });
}
