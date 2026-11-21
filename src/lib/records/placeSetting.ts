import { useSyncExternalStore } from 'react';
import { storageKey } from '../storage';

/**
 * A setting a storage place needs, e.g. the Convex deployment URL. Not secret, so it is kept as it is
 * in this browser: `{ version: 1, values: { <place id>: value } }`.
 */
const KEY = storageKey('place-settings');
const listeners = new Set<() => void>();

function readAll(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return {};
    const stored = JSON.parse(raw) as { version?: unknown; values?: unknown };
    if (stored.version !== 1 || typeof stored.values !== 'object' || stored.values === null) return {};
    return Object.fromEntries(
      Object.entries(stored.values).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  } catch {
    return {};
  }
}

/** The saved value of a place's setting, or an empty string. */
export const getPlaceSetting = (id: string): string => readAll()[id] ?? '';

/** Saves a place's setting (an empty value clears it). Says whether it worked, so the caller can show it. */
export function setPlaceSetting(id: string, value: string): { ok: true } | { ok: false; message: string } {
  try {
    const values = { ...readAll(), [id]: value };
    if (value === '') delete values[id];
    localStorage.setItem(KEY, JSON.stringify({ version: 1, values }));
  } catch {
    return { ok: false, message: 'Browser storage is unavailable, so the setting was not saved.' };
  }
  for (const listener of listeners) listener();
  return { ok: true };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export const usePlaceSetting = (id: string): string =>
  useSyncExternalStore(
    subscribe,
    () => getPlaceSetting(id),
    () => '',
  );
