import { use } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { DashboardContext } from '../context';
import { currentDocument, type DashboardState } from '../store';

function useDashboardStore() {
  const store = use(DashboardContext);
  if (!store) throw new Error('Dashboard hooks need <DashboardProvider>');
  return store;
}

export function useDashboardState<T>(selector: (state: DashboardState) => T): T {
  return useStore(useDashboardStore(), selector);
}
export const useDashboardActions = () => useDashboardState((state) => state.actions);
export const useWidget = (id: string) => useDashboardState((state) => state.doc.widgets[id]);
export function useHistory() {
  return useStore(
    useDashboardStore().temporal,
    useShallow((state) => ({ canUndo: state.pastStates.length > 0, canRedo: state.futureStates.length > 0 })),
  );
}
/** Event callbacks read the latest document without subscribing the whole page. */
export function useDocumentReader() {
  const store = useDashboardStore();
  return () => currentDocument(store.getState());
}
