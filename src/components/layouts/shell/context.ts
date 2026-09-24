import { createContext } from 'react';
import type { ContextTab } from './model/contextTabs';
import type { ShellStoreApi } from './store';

export const ShellContext = createContext<ShellStoreApi | null>(null);

/** Context-bar tabs shown on every route, after the route's own. Set by `ShellProvider`. */
export const GlobalTabsContext = createContext<ContextTab[]>([]);
