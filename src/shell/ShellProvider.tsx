import { useState, type ReactNode } from 'react';
import type { ContextTab } from './ContextTab';
import { createShellStore, type ShellInit, type ShellStoreApi } from './createShellStore';
import type { Nav } from './Nav';
import { ShellContext } from './useShell';

const noTabs: ContextTab[] = [];
const noNav: Nav = { main: [], bottom: [], areas: [] };

export interface ShellProviderProps {
  children: ReactNode;
  /** Inject a store for stories and tests. */
  store?: ShellStoreApi;
  initialState?: ShellInit;
  /** The app's navigation (`app/nav.ts`), so the shell never knows a route. Keep it stable. */
  nav?: Nav;
  /**
   * Context-bar tabs shown on every route, after the route's own (e.g. notifications). The app
   * passes them in, so the shell never imports a feature. Keep the array stable (module constant).
   */
  globalTabs?: ContextTab[];
}

/** The only place that knows the shell state lives in Zustand. Consumers use the hooks in `useShell.ts`. */
export function ShellProvider({
  children,
  store,
  initialState,
  nav = noNav,
  globalTabs = noTabs,
}: ShellProviderProps) {
  const [shellStore] = useState(() => store ?? createShellStore(initialState));
  return <ShellContext value={{ store: shellStore, nav, globalTabs }}>{children}</ShellContext>;
}
