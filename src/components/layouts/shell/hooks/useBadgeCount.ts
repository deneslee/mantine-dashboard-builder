import { useMemo, useSyncExternalStore } from 'react';
import type { ContextTab, TabBadge } from '../model/contextTabs';

const none = () => () => {};
const zero = () => 0;

/** Live count for one tab badge. */
export function useBadgeCount(badge: TabBadge | undefined): number {
  return useSyncExternalStore(badge?.subscribe ?? none, badge?.getSnapshot ?? zero);
}

/** Live sum across all tabs; one subscription regardless of how many tabs the route declares. */
export function useTotalBadgeCount(tabs: ContextTab[]): number {
  const combined = useMemo(() => {
    const badges = tabs.flatMap((t) => (t.badge ? [t.badge] : []));
    return {
      subscribe: (onChange: () => void) => {
        const unsubs = badges.map((b) => b.subscribe(onChange));
        return () => unsubs.forEach((u) => u());
      },
      getSnapshot: () => badges.reduce((n, b) => n + b.getSnapshot(), 0),
    };
  }, [tabs]);
  return useSyncExternalStore(combined.subscribe, combined.getSnapshot);
}
