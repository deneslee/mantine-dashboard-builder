import { useMatches } from '@tanstack/react-router';
import { useMemo } from 'react';
import { notificationsTab } from '@/features/notifications';
import type { ContextTab } from '../model/contextTabs';

/** Merges `staticData.contextTabs` from root to leaf, then the global notifications tab. */
export function useContextTabs(): ContextTab[] {
  const routeTabs = useMatches({
    select: (matches) => matches.flatMap((m) => m.staticData.contextTabs ?? []),
  });
  return useMemo(() => {
    const seen = new Set<string>();
    const merged: ContextTab[] = [];
    for (const tab of [...routeTabs, notificationsTab]) {
      if (seen.has(tab.id)) continue;
      seen.add(tab.id);
      merged.push(tab);
    }
    return merged;
  }, [routeTabs]);
}
