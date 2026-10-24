import { useState, type ReactNode } from 'react';
import { createVaultStore, type VaultStoreApi } from './createVaultStore';
import { VaultContext } from './useVault';

/** The only place that knows the vault lives in Zustand; consumers use the hooks in `useVault.ts`. */
export function VaultProvider({ children, store }: { children: ReactNode; store?: VaultStoreApi }) {
  const [vault] = useState(() => store ?? createVaultStore());
  return <VaultContext value={vault}>{children}</VaultContext>;
}
