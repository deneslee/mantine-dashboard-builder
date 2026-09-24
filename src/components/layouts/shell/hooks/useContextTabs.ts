import { useMatches } from '@tanstack/react-router';
import { use, useMemo } from 'react';
import { GlobalTabsContext } from '../context';
import type { ContextTab } from '../model/contextTabs';

/** Merges `staticData.contextTabs` from root to leaf, then the global tabs from `ShellProvider`. */
export function useContextTabs(): ContextTab[] {
  const globalTabs = use(GlobalTabsContext);
  const routeTabs = useMatches({
    select: (matches) => matches.flatMap((m) => m.staticData.contextTabs ?? []),
  });
  return useMemo(() => {
    const seen = new Set<string>();
    const merged: ContextTab[] = [];
    for (const tab of [...routeTabs, ...globalTabs]) {
      if (seen.has(tab.id)) continue;
      seen.add(tab.id);
      merged.push(tab);
    }
    return merged;
  }, [routeTabs, globalTabs]);
}
