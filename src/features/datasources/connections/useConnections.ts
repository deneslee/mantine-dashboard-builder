import { createContext, use } from 'react';
import { useStore } from 'zustand';
import type { ConnectionsStore, ConnectionsStoreApi } from './createConnectionsStore';

/** Set by `ConnectionsProvider`. */
export const ConnectionsContext = createContext<ConnectionsStoreApi | null>(null);

function useConnectionsStore<T>(selector: (s: ConnectionsStore) => T): T {
  const store = use(ConnectionsContext);
  if (!store) throw new Error('Connection hooks must be used inside <ConnectionsProvider> (app/Providers).');
  return useStore(store, selector);
}

export const useConnections = () => useConnectionsStore((s) => s.connections);

export const useConnection = (id: string) =>
  useConnectionsStore((s) => s.connections.find((connection) => connection.id === id));

export const useConnectionActions = () => useConnectionsStore((s) => s.actions);
