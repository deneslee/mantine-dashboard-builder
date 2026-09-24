import { useState, type ReactNode } from 'react';
import { GlobalTabsContext, ShellContext } from './context';
import type { ContextTab } from './model/contextTabs';
import { createShellStore, type ShellInit, type ShellStoreApi } from './store';

const noTabs: ContextTab[] = [];

export interface ShellProviderProps {
  children: ReactNode;
  /** Inject a store for stories and tests. */
  store?: ShellStoreApi;
  initialState?: ShellInit;
  /**
   * Context-bar tabs shown on every route, after the route's own (e.g. notifications). The app
   * passes them in, so the shell never imports a feature. Keep the array stable (module constant).
   */
  globalTabs?: ContextTab[];
}

/** The only place that knows the shell state lives in Zustand. Consumers use the hooks in `useShell.ts`. */
export function ShellProvider({ children, store, initialState, globalTabs = noTabs }: ShellProviderProps) {
  const [value] = useState(() => store ?? createShellStore(initialState));
  return (
    <ShellContext value={value}>
      <GlobalTabsContext value={globalTabs}>{children}</GlobalTabsContext>
    </ShellContext>
  );
}
