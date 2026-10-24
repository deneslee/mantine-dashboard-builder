import { z } from 'zod';
import { createStore } from 'zustand/vanilla';
import {
  PBKDF2_ITERATIONS,
  deriveKey,
  seal,
  unlock as unlockBox,
  type VaultKey,
} from '@/core/crypto/passphraseCipher';
import { AppError } from '@/core/errors/AppError';
import { storageKey } from '../storage';

/**
 * Secrets the user typed in: connection passwords, keys and connection strings, and the GitHub token
 * for Add to build. They live in memory. One saved "on this device" is encrypted with a key derived
 * from the user's passphrase, and the key is held in memory only, so a reload locks the vault.
 * Research: .agents/planning/research/browser-secrets.md.
 */

export const VAULT_STORAGE_KEY = storageKey('vault');

export interface VaultEntry {
  secrets: Record<string, string>;
  /** What the secrets belong to; a different fingerprint when they're used means it changed outside the app. */
  fingerprint: string;
  /** Encrypted on this device; otherwise kept for this session only. */
  isSaved: boolean;
}

export type VaultLookup =
  | { status: 'ready'; secrets: Record<string, string> }
  | { status: 'locked' }
  | { status: 'missing' }
  | { status: 'changed' };

export interface VaultState {
  /** A passphrase was set up on this device. */
  hasVault: boolean;
  /** There is a vault and its key isn't in memory: saved secrets can't be read. */
  isLocked: boolean;
  /** The keys saved in the vault, readable while it's locked. */
  savedKeys: string[];
  /** Secrets in memory: saved ones while unlocked, and session-only ones. */
  entries: Record<string, VaultEntry>;
  /** Bumped per key whenever what `lookup` returns for it may change. */
  versions: Record<string, number>;
}

export interface VaultActions {
  /** Sets up a passphrase on this device; the vault starts unlocked. */
  create: (passphrase: string) => Promise<void>;
  /** Rejects with a `forbidden` AppError when the passphrase is wrong. */
  unlock: (passphrase: string) => Promise<void>;
  /** Forgets the key and the saved secrets; session-only ones stay until the tab closes. */
  lock: () => void;
  /** Saving (`isSaved`) needs an unlocked vault. */
  set: (key: string, entry: VaultEntry) => Promise<void>;
  remove: (key: string) => Promise<void>;
  /** Deletes the vault and every saved secret, for a forgotten passphrase. */
  reset: () => void;
  lookup: (key: string, fingerprint: string) => VaultLookup;
}

export type VaultStore = VaultState & { actions: VaultActions };
export type VaultStoreApi = ReturnType<typeof createVaultStore>;

const sealedBoxSchema = z.object({
  version: z.literal(1),
  iterations: z.number().int().positive(),
  salt: z.string(),
  iv: z.string(),
  data: z.string(),
});

/** What `localStorage` holds: the sealed entries, and their keys so a locked vault can say "locked". */
const storedVaultSchema = z.object({
  version: z.literal(1),
  keys: z.array(z.string()),
  box: sealedBoxSchema,
});

const savedEntriesSchema = z.record(
  z.string(),
  z.object({ secrets: z.record(z.string(), z.string()), fingerprint: z.string(), isSaved: z.literal(true) }),
);

/** What the vault has for `key`, read from its state. */
export function lookupEntry(state: VaultState, key: string, fingerprint: string): VaultLookup {
  const entry = state.entries[key];
  if (entry)
    return entry.fingerprint === fingerprint
      ? { status: 'ready', secrets: entry.secrets }
      : { status: 'changed' };
  if (state.isLocked && state.savedKeys.includes(key)) return { status: 'locked' };
  return { status: 'missing' };
}

const WRONG_PASSPHRASE = "That passphrase doesn't open the secrets saved on this device.";

export function createVaultStore({
  storage = globalThis.localStorage as Storage | undefined,
  iterations = PBKDF2_ITERATIONS,
}: { storage?: Storage; iterations?: number } = {}) {
  const read = () => {
    try {
      const parsed = storedVaultSchema.safeParse(JSON.parse(storage?.getItem(VAULT_STORAGE_KEY) ?? 'null'));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  };
  // The key never enters the store's state, so nothing that reads state (devtools, a selector) sees it.
  let key: VaultKey | null = null;
  const stored = read();

  return createStore<VaultStore>()((set, get) => {
    const bump = (keys: string[]) =>
      set((s) => ({
        versions: { ...s.versions, ...Object.fromEntries(keys.map((k) => [k, (s.versions[k] ?? 0) + 1])) },
      }));

    /** Seals every saved entry under the key and stores the box. */
    const persist = async (entries: Record<string, VaultEntry>) => {
      if (!key) throw new AppError('forbidden', 'Unlock your saved secrets first.', { isRetryable: false });
      const saved = Object.fromEntries(Object.entries(entries).filter(([, entry]) => entry.isSaved));
      const box = await seal(key, JSON.stringify(saved));
      try {
        storage?.setItem(VAULT_STORAGE_KEY, JSON.stringify({ version: 1, keys: Object.keys(saved), box }));
      } catch (error) {
        throw new AppError('unknown', "This browser didn't let the app save on this device.", {
          cause: error,
        });
      }
      set({ savedKeys: Object.keys(saved) });
    };

    return {
      hasVault: stored !== null,
      isLocked: stored !== null,
      savedKeys: stored?.keys ?? [],
      entries: {},
      versions: {},
      actions: {
        create: async (passphrase) => {
          if (get().hasVault)
            throw new AppError('validation', 'A passphrase is already set up on this device.');
          key = await deriveKey(passphrase, { iterations });
          set({ hasVault: true, isLocked: false });
          await persist(get().entries);
        },
        unlock: async (passphrase) => {
          const current = read();
          if (!current)
            throw new AppError('validation', 'Nothing is saved on this device.', { isRetryable: false });
          let opened: { key: VaultKey; text: string };
          try {
            opened = await unlockBox(passphrase, current.box);
          } catch (error) {
            throw new AppError('forbidden', WRONG_PASSPHRASE, { cause: error, isRetryable: false });
          }
          const saved = savedEntriesSchema.safeParse(JSON.parse(opened.text));
          if (!saved.success)
            throw new AppError('validation', "The secrets saved on this device can't be read.");
          key = opened.key;
          // Anything typed this session wins over what was saved.
          set((s) => ({
            isLocked: false,
            savedKeys: Object.keys(saved.data),
            entries: { ...saved.data, ...s.entries },
          }));
          bump(Object.keys(saved.data));
        },
        lock: () => {
          if (!get().hasVault) return;
          key = null;
          const { entries } = get();
          set({
            isLocked: true,
            entries: Object.fromEntries(Object.entries(entries).filter(([, e]) => !e.isSaved)),
          });
          bump(Object.keys(entries));
        },
        set: async (entryKey, entry) => {
          const wasSaved = get().entries[entryKey]?.isSaved ?? get().savedKeys.includes(entryKey);
          if (entry.isSaved && !key)
            throw new AppError('forbidden', 'Unlock your saved secrets first.', { isRetryable: false });
          const entries = { ...get().entries, [entryKey]: entry };
          if (entry.isSaved || (wasSaved && key)) await persist(entries);
          set({ entries });
          bump([entryKey]);
        },
        remove: async (entryKey) => {
          const { [entryKey]: removed, ...entries } = get().entries;
          const isSaved = removed?.isSaved || get().savedKeys.includes(entryKey);
          if (isSaved && !key)
            throw new AppError('forbidden', 'Unlock your saved secrets first, so these are deleted too.', {
              isRetryable: false,
            });
          if (isSaved) await persist(entries);
          set({ entries });
          bump([entryKey]);
        },
        reset: () => {
          key = null;
          try {
            storage?.removeItem(VAULT_STORAGE_KEY);
          } catch {
            // Unavailable storage: nothing was saved.
          }
          const { entries, savedKeys } = get();
          set({
            hasVault: false,
            isLocked: false,
            savedKeys: [],
            entries: Object.fromEntries(Object.entries(entries).filter(([, e]) => !e.isSaved)),
          });
          bump([...Object.keys(entries), ...savedKeys]);
        },
        lookup: (entryKey, fingerprint) => lookupEntry(get(), entryKey, fingerprint),
      },
    };
  });
}
