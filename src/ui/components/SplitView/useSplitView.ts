import { createContext, use } from 'react';
import type { PaneState } from './splitViewLayout';

export interface PaneContextValue {
  id: string;
  label?: string;
  state: PaneState;
  isCompact: boolean;
  isDrawer: boolean;
  canCompact: boolean;
  canClose: boolean;
  /** Where the pane sits, so the compact button points the right way. */
  side: 'start' | 'end';
  open: () => void;
  compact: () => void;
  collapse: () => void;
  close: () => void;
}

export interface SplitViewContextValue {
  getState: (id: string) => PaneState | undefined;
  setState: (id: string, state: PaneState) => void;
}

export const SplitViewContext = createContext<SplitViewContextValue | null>(null);
export const PaneContext = createContext<PaneContextValue | null>(null);

/** Open, compact, collapse or close any pane of the nearest SplitView, e.g. from an "Add widget" button. */
export function useSplitView() {
  const context = use(SplitViewContext);
  if (!context) throw new Error('useSplitView must be used inside SplitView.Root');
  const set = (state: PaneState) => (id: string) => context.setState(id, state);
  return {
    state: context.getState,
    open: set('open'),
    compact: set('compact'),
    collapse: set('collapsed'),
    close: set('closed'),
  };
}

/** The pane this is rendered in: its state and actions, for `SplitView.Header` and pane content. */
export function useSplitViewPane() {
  const context = use(PaneContext);
  if (!context) throw new Error('useSplitViewPane must be used inside SplitView.Pane');
  return context;
}
