import { createContext } from 'react';
import type { ContextTab } from './ContextTab';
import type { ShellStoreApi } from './createShellStore';

export const ShellContext = createContext<ShellStoreApi | null>(null);

/** Context-bar tabs shown on every route, after the route's own. Set by `ShellProvider`. */
export const GlobalTabsContext = createContext<ContextTab[]>([]);
