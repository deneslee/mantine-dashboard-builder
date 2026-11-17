import { useSyncExternalStore } from 'react';
import { AppError } from '@/core/errors/AppError';
import type { RecordProvider } from '@/core/records/RecordProvider';
import { storageKey } from '../storage';

/** What the setting needs of a registered provider; `lib/` cannot import `plugins/`, so this is structural. */
export type RecordProviderEntries = Record<string, { load(): Promise<RecordProvider> }>;

const STORAGE_KEY = storageKey('record-provider');
/** Always registered by `app/`, and what an unknown or missing setting falls back to. */
const DEFAULT_ID = 'browser';

let entries: RecordProviderEntries = {};
const loading = new Map<string, Promise<RecordProvider>>();
const listeners = new Set<() => void>();

/** Called once by `app/` at startup with the registered providers. */
export function configureRecordProviders(providers: RecordProviderEntries) {
  entries = providers;
  loading.clear();
}

/** The stored id, with its version in the value: `{ version: 1, id }`. Anything else reads as the default. */
export function getActiveRecordProviderId(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_ID;
    const stored = JSON.parse(raw) as { version?: unknown; id?: unknown };
    return stored.version === 1 && typeof stored.id === 'string' ? stored.id : DEFAULT_ID;
  } catch {
    return DEFAULT_ID;
  }
}

export function setActiveRecordProviderId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, id }));
  } catch {
    // Unavailable storage: the setting stays as it was.
    return;
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useActiveRecordProviderId() {
  return useSyncExternalStore(subscribe, getActiveRecordProviderId, () => DEFAULT_ID);
}

/**
 * The provider the setting names, loaded once. An id that is not registered (a build without Convex,
 * after the setting named it) falls back to `browser`. Takes no argument, so plain functions can call it.
 */
export function loadActiveRecordProvider(): Promise<RecordProvider> {
  const wanted = getActiveRecordProviderId();
  const id = Object.hasOwn(entries, wanted) ? wanted : DEFAULT_ID;
  const entry = entries[id];
  if (!entry) return Promise.reject(new AppError('unknown', 'No record provider is registered.'));
  let provider = loading.get(id);
  if (!provider) {
    provider = entry.load();
    loading.set(id, provider);
    // A failed load is tried again next time.
    provider.catch(() => loading.delete(id));
  }
  return provider;
}
