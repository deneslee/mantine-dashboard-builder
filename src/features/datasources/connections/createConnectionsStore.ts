import { z } from 'zod';
import { persist } from 'zustand/middleware';
import { createStore, type StateCreator } from 'zustand/vanilla';
import { storageKey } from '@/lib/storage';
import type { Connection } from '@/plugins/OptionalPlugin';

/**
 * The connections the user created: everything but their secrets, which live in the vault. Queries
 * name a connection by id, so `app/` turns each one into a datasource.
 */

export const CONNECTIONS_STORAGE_KEY = storageKey('connections');

/** A connection id: a short slug, the name queries use. */
export const CONNECTION_ID = /^[a-z0-9][a-z0-9-]{0,62}$/;

const connectionSchema = z.object({
  id: z.string().regex(CONNECTION_ID),
  plugin: z.string(),
  type: z.string(),
  name: z.string().min(1),
  settings: z.record(z.string(), z.unknown()),
  updatedAt: z.string(),
});

export interface ConnectionsState {
  connections: Connection[];
}

export interface ConnectionsActions {
  /** Adds the connection, or replaces the one with its id; `updatedAt` becomes now. */
  save: (connection: Omit<Connection, 'updatedAt'>) => Connection;
  remove: (id: string) => void;
}

export type ConnectionsStore = ConnectionsState & { actions: ConnectionsActions };
export type ConnectionsStoreApi = ReturnType<typeof createConnectionsStore>;

/** Stored connections that still parse; anything else in storage is dropped rather than trusted. */
const parseStored = (value: unknown): Connection[] =>
  z
    .array(z.unknown())
    .catch([])
    .parse(value)
    .flatMap((item) => {
      const parsed = connectionSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });

/** `shouldPersist: false` skips localStorage (stories, tests). */
export function createConnectionsStore({
  initial = [],
  shouldPersist = true,
}: { initial?: Connection[]; shouldPersist?: boolean } = {}) {
  const creator: StateCreator<ConnectionsStore> = (set) => ({
    connections: initial,
    actions: {
      save: (draft) => {
        const connection: Connection = { ...draft, updatedAt: new Date().toISOString() };
        set((s) => ({
          connections: s.connections.some((c) => c.id === draft.id)
            ? s.connections.map((c) => (c.id === draft.id ? connection : c))
            : [...s.connections, connection],
        }));
        return connection;
      },
      remove: (id) => set((s) => ({ connections: s.connections.filter((c) => c.id !== id) })),
    },
  });

  if (!shouldPersist) return createStore<ConnectionsStore>()(creator);

  return createStore<ConnectionsStore>()(
    persist(creator, {
      name: CONNECTIONS_STORAGE_KEY,
      version: 1,
      partialize: (s) => ({ connections: s.connections }),
      merge: (persisted, current) => ({
        ...current,
        connections: parseStored((persisted as { connections?: unknown } | undefined)?.connections),
      }),
    }),
  );
}
