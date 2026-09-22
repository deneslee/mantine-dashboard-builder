import { useState, type ReactNode } from 'react';
import { ShellContext } from './context';
import { createShellStore, type ShellInit, type ShellStoreApi } from './store';

export interface ShellProviderProps {
  children: ReactNode;
  /** Inject a store for stories and tests. */
  store?: ShellStoreApi;
  initialState?: ShellInit;
}

/** The only place that knows the shell state lives in Zustand. Consumers use the hooks in `useShell.ts`. */
export function ShellProvider({ children, store, initialState }: ShellProviderProps) {
  const [value] = useState(() => store ?? createShellStore(initialState));
  return <ShellContext value={value}>{children}</ShellContext>;
}
