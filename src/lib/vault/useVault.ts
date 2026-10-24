import { createContext, use } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { lookupEntry, type VaultStore, type VaultStoreApi } from './createVaultStore';

/** Set by `VaultProvider`. */
export const VaultContext = createContext<VaultStoreApi | null>(null);

function useVaultStoreApi() {
  const store = use(VaultContext);
  if (!store) throw new Error('Vault hooks must be used inside <VaultProvider> (app/Providers).');
  return store;
}

function useVaultStore<T>(selector: (s: VaultStore) => T): T {
  return useStore(useVaultStoreApi(), selector);
}

export const useVaultStatus = () =>
  useVaultStore(useShallow((s) => ({ hasVault: s.hasVault, isLocked: s.isLocked })));

export const useVaultActions = () => useVaultStore((s) => s.actions);

/** Whether the vault has secrets for `key` that fit `fingerprint`: ready, locked, missing or changed. */
export const useVaultEntryStatus = (key: string, fingerprint: string) =>
  useVaultStore((s) => lookupEntry(s, key, fingerprint).status);

/** Whether `key`'s secrets are saved on this device (rather than kept for this session). */
export const useIsVaultEntrySaved = (key: string) =>
  useVaultStore((s) => s.entries[key]?.isSaved ?? s.savedKeys.includes(key));

/** Per-key versions, for revisions that change whenever a key's secrets do. */
export const useVaultVersions = () => useVaultStore((s) => s.versions);

/** Reads secrets when a query runs, without re-rendering when they change (`getState`). */
export const useReadVault = () => useVaultStoreApi().getState().actions.lookup;
