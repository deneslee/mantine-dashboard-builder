import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { InboxItem, NotifyLevel } from '@/lib/notify/types';

const MAX_ITEMS = 50;

interface InboxStore {
  items: InboxItem[];
  add: (item: Omit<InboxItem, 'id' | 'at' | 'read' | 'count'> & { dedupeKey?: string }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

/** Persistent inbox for warnings and errors. Toasts are transient; this is what the context tab shows. */
export const useInbox = create<InboxStore>()(
  persist(
    (set) => ({
      items: [],
      add: ({ dedupeKey, ...item }) =>
        set((s) => {
          const key = dedupeKey ?? `${item.level}:${item.title}`;
          const existing = s.items.find((i) => `${i.level}:${i.title}` === key && !i.read);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.id === existing.id
                  ? { ...i, count: i.count + 1, at: Date.now(), message: item.message }
                  : i,
              ),
            };
          }
          const next: InboxItem = { ...item, id: crypto.randomUUID(), at: Date.now(), read: false, count: 1 };
          return { items: [next, ...s.items].slice(0, MAX_ITEMS) };
        }),
      markRead: (id) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, read: true } : i)) })),
      markAllRead: () => set((s) => ({ items: s.items.map((i) => ({ ...i, read: true })) })),
      dismiss: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'notifications.v1', version: 1, partialize: (s) => ({ items: s.items }) },
  ),
);

export const selectUnread = (s: InboxStore) => s.items.filter((i) => !i.read).length;
export const inboxLevels: NotifyLevel[] = ['warning', 'error'];
