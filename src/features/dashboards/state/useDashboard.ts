import { use } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { DashboardContext } from './context';
import { selectDashboard, type DashboardState } from './createDashboardStore';

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
/** Event callbacks read the latest document without subscribing the whole page. */
export function useReadDashboard() {
  const store = useDashboardStore();
  return () => selectDashboard(store.getState());
}
