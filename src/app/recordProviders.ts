import type { RecordProviderPlugin } from '@/plugins/RecordProviderPlugin';
import { storageKey } from '@/lib/storage';
import { BROWSER_STORAGE_CAPABILITIES } from '@/plugins/recordProviders/browserStorage/browserStorageCapabilities';
import { createConvexRecordProviderPlugin } from '@/plugins/recordProviders/convex/convexRecordProviderPlugin';

/** Whether this build names a Convex deployment (`VITE_CONVEX_URL`); without one Convex is not a place. */
export const CONVEX_CONFIGURED = Boolean(import.meta.env.VITE_CONVEX_URL);

const browserProvider: RecordProviderPlugin = {
  id: 'browser',
  name: 'This browser',
  description: 'Saves in this browser only.',
  capabilities: BROWSER_STORAGE_CAPABILITIES,
  load: async () => {
    // Loaded on first use, like Convex's code, so the provider is not in the entry bundle.
    const { createBrowserStorageProvider } =
      await import('@/plugins/recordProviders/browserStorage/browserStorageProvider');
    return createBrowserStorageProvider({ storage: localStorage, keyFor: storageKey });
  },
};

/**
 * The places records can be saved. Convex is built in, but listed only when `VITE_CONVEX_URL` names a
 * deployment.
 */
export function createRecordProviders(convexUrl: string | undefined = import.meta.env.VITE_CONVEX_URL) {
  return convexUrl ? [browserProvider, createConvexRecordProviderPlugin(convexUrl)] : [browserProvider];
}
