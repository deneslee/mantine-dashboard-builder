/**
 * Every localStorage key the app writes: `dashboard-builder:<name>`. The prefix keeps them apart
 * from other apps on the same origin (GitHub Pages); there is no version in the key, because each
 * value carries its own (zustand persist `version`, a dashboard's `schemaVersion`).
 * `index.html`'s pre-paint script hard-codes `storageKey('color-scheme')`; a test keeps them equal.
 */
export const storageKey = (name: string) => `dashboard-builder:${name}`;

/** Keys written before Oct 2026, and their names now. */
const LEGACY_KEYS: Record<string, string> = {
  'shell.v1': 'shell',
  'notifications.v1': 'notifications',
  'motion.v1': 'motion',
  'color-scheme': 'color-scheme',
  'sentry.config.v1': 'sentry',
};
const LEGACY_PREFIXES: Record<string, string> = {
  'dashboard.saved.v1:': 'saved:',
  'dashboard.draft.v1:': 'draft:',
};

const legacyName = (key: string) => {
  if (Object.hasOwn(LEGACY_KEYS, key)) return LEGACY_KEYS[key];
  const prefix = Object.keys(LEGACY_PREFIXES).find((p) => key.startsWith(p));
  return prefix && LEGACY_PREFIXES[prefix] + key.slice(prefix.length);
};

/**
 * Moves values from the old keys to `storageKey(name)`. A value already under the new key wins.
 * Storage that throws (private mode) is left alone.
 * ponytail: delete after 2027-01, when returning visitors have been migrated.
 */
export function migrateLegacyKeys(storage: Storage = localStorage) {
  try {
    const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i)!);
    for (const old of keys) {
      const name = legacyName(old);
      if (!name) continue;
      const value = storage.getItem(old);
      if (value !== null && storage.getItem(storageKey(name)) === null)
        storage.setItem(storageKey(name), value);
      storage.removeItem(old);
    }
  } catch {
    // Unavailable storage: nothing to migrate.
  }
}

// Runs when this module is first evaluated. Every module that reads a key imports `storageKey` from
// here, so the import graph puts this before any read, including stores that hydrate at module
// load (useInbox). A call in main.tsx would run too late: imports are evaluated first.
if (typeof localStorage !== 'undefined') migrateLegacyKeys();
