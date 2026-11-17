import type { PageTabEntry } from '../ContextTab';

export interface PageTabStore {
  subscribe: (onChange: () => void) => () => void;
  /** Registration order; a new array on every change, the same array otherwise. */
  getSnapshot: () => readonly PageTabEntry[];
  /** Adds the entry and returns its removal. Removal is by identity, so a stale cleanup never removes a newer entry. */
  register: (entry: PageTabEntry) => () => void;
}

/** The tabs mounted pages have added to the bar. Not deduplicated: `useContextTabs` does that, first wins. */
export function createPageTabStore(): PageTabStore {
  let entries: readonly PageTabEntry[] = [];
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  return {
    subscribe: (onChange) => {
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
      };
    },
    getSnapshot: () => entries,
    register: (entry) => {
      entries = [...entries, entry];
      notify();
      return () => {
        if (!entries.includes(entry)) return;
        entries = entries.filter((e) => e !== entry);
        notify();
      };
    },
  };
}
