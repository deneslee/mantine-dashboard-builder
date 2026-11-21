import { useSyncExternalStore } from 'react';
import { AppError } from '@/core/errors/AppError';
import type { RecordProvider } from '@/core/records/RecordProvider';
import { storageKey } from '../storage';

/** What the setting needs of a registered provider; `lib/` cannot import `plugins/`, so this is structural. */
export type RecordProviderEntries = Record<string, { name: string; load(): Promise<RecordProvider> }>;

/**
 * The place the setting resolves to. One value is used for loading, labels, query keys and save results,
 * so they cannot disagree. `isFallback`: the stored id is not registered in this build.
 */
export interface ResolvedPlace {
  id: string;
  name: string;
  isFallback: boolean;
}

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

let lastPlace: ResolvedPlace | undefined;

/** The place in use. The same object while it does not change, so it can be a snapshot for React. */
export function getActivePlace(): ResolvedPlace {
  const wanted = getActiveRecordProviderId();
  const id = Object.hasOwn(entries, wanted) ? wanted : DEFAULT_ID;
  const name = entries[id]?.name ?? id;
  const isFallback = id !== wanted;
  if (lastPlace?.id !== id || lastPlace.name !== name || lastPlace.isFallback !== isFallback)
    lastPlace = { id, name, isFallback };
  return lastPlace;
}

/**
 * Changes the place in use. It says whether that worked, so the caller can show the outcome. Only a
 * registered place can be chosen.
 */
export function setActiveRecordProviderId(id: string): { ok: true } | { ok: false; message: string } {
  if (!Object.hasOwn(entries, id)) return { ok: false, message: `"${id}" is not available in this build.` };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, id }));
  } catch {
    return { ok: false, message: 'Browser storage is unavailable, so the setting was not changed.' };
  }
  for (const listener of listeners) listener();
  return { ok: true };
}

/** `listener` runs when the setting changes in this tab, or in another one (the `storage` event). */
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

export function useActivePlace(): ResolvedPlace {
  return useSyncExternalStore(subscribe, getActivePlace, getActivePlace);
}

/** `listener` gets the new place each time the place in use changes (not when the same one is set again). */
export function onActivePlaceChange(listener: (place: ResolvedPlace) => void): () => void {
  let known = getActivePlace();
  return subscribe(() => {
    const next = getActivePlace();
    if (next === known) return;
    known = next;
    listener(next);
  });
}

/** A registered place's provider, loaded once. A failed load is tried again next time. */
export function loadRecordProvider(id: string): Promise<RecordProvider> {
  const entry = Object.hasOwn(entries, id) ? entries[id] : undefined;
  if (!entry) return Promise.reject(new AppError('unknown', `"${id}" is not available in this build.`));
  let provider = loading.get(id);
  if (!provider) {
    provider = entry.load();
    loading.set(id, provider);
    provider.catch(() => loading.delete(id));
  }
  return provider;
}

/** Forgets a loaded provider, so the next use loads it again (its setting changed). */
export function resetRecordProvider(id: string) {
  loading.delete(id);
}

/** The provider of the place in use. Takes no argument, so plain functions can call it. */
export const loadActiveRecordProvider = () => loadRecordProvider(getActivePlace().id);
