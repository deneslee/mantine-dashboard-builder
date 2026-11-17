import { useState, type ReactNode } from 'react';
import { createPageTabStore } from './createPageTabStore';
import { PageTabsContext } from './usePageTabs';

/** Holds the page-tab registry for the shell. Mounted by `ShellProvider`. */
export function PageTabsProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createPageTabStore);
  return <PageTabsContext value={store}>{children}</PageTabsContext>;
}
