import { useMatches } from '@tanstack/react-router';
import { useMemo } from 'react';
import { useGlobalTabs } from '../useShell';
import type { ContextTab } from '../ContextTab';

/** Merges `staticData.contextTabs` from root to leaf, then the global tabs from `ShellProvider`. */
export function useContextTabs(): ContextTab[] {
  const globalTabs = useGlobalTabs();
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
