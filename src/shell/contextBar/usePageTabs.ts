import { createContext, use, useSyncExternalStore } from 'react';
import type { PageTabEntry } from '../ContextTab';
import type { PageTabStore } from './createPageTabStore';

export const PageTabsContext = createContext<PageTabStore | null>(null);

/** The page-tab registry. Throws outside <ShellProvider>, like the shell hooks. */
export function usePageTabStore(): PageTabStore {
  const store = use(PageTabsContext);
  if (!store) throw new Error('Shell hooks must be used inside <ShellProvider>');
  return store;
}

/** The page tabs currently registered, in registration order. */
export function usePageTabs(): readonly PageTabEntry[] {
  const store = usePageTabStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
