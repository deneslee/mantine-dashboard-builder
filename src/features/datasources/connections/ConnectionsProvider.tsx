import { useState, type ReactNode } from 'react';
import { createConnectionsStore, type ConnectionsStoreApi } from './createConnectionsStore';
import { ConnectionsContext } from './useConnections';

/** The only place that knows connections live in Zustand; consumers use the hooks in `useConnections.ts`. */
export function ConnectionsProvider({
  children,
  store,
}: {
  children: ReactNode;
  store?: ConnectionsStoreApi;
}) {
  const [connections] = useState(() => store ?? createConnectionsStore());
  return <ConnectionsContext value={connections}>{children}</ConnectionsContext>;
}
