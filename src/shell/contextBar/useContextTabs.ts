import { useMatches } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useGlobalTabs } from '../useShell';
import type { ContextTab, PageTabEntry } from '../ContextTab';
import { usePageTabs } from './usePageTabs';

export type BarTab = ContextTab | PageTabEntry;

export const isPageTab = (tab: BarTab): tab is PageTabEntry => 'host' in tab;

/**
 * Merges `staticData.contextTabs` from root to leaf, then the tabs mounted pages render through
 * `ContextBarPanel`, then the global tabs from `ShellProvider`. The first tab with an id wins.
 */
export function useContextTabs(): BarTab[] {
  const globalTabs = useGlobalTabs();
  const pageTabs = usePageTabs();
  const routeTabs = useMatches({
    select: (matches) => matches.flatMap((m) => m.staticData.contextTabs ?? []),
  });
  return useMemo(() => {
    const seen = new Set<string>();
    const merged: BarTab[] = [];
    for (const tab of [...routeTabs, ...pageTabs, ...globalTabs]) {
      if (seen.has(tab.id)) continue;
      seen.add(tab.id);
      merged.push(tab);
    }
    return merged;
  }, [routeTabs, pageTabs, globalTabs]);
}
