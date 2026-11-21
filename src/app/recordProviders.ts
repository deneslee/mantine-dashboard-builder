import type { RecordProviderPlugin } from '@/plugins/RecordProviderPlugin';
import { getPlaceSetting } from '@/lib/records/placeSetting';
import { storageKey } from '@/lib/storage';
import { BROWSER_STORAGE_CAPABILITIES } from '@/plugins/recordProviders/browserStorage/browserStorageCapabilities';
import { createConvexRecordProviderPlugin } from '@/plugins/recordProviders/convex/convexRecordProviderPlugin';

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

/** The deployment the user saved on the Convex page, else the build's `VITE_CONVEX_URL`, else none. */
export const getConvexUrl = (): string =>
  getPlaceSetting('convex') || (import.meta.env.VITE_CONVEX_URL ?? '');

/** The places records can be saved. Convex is always listed; its page asks for the deployment URL. */
export function createRecordProviders(getUrl: () => string = getConvexUrl) {
  return [browserProvider, createConvexRecordProviderPlugin(getUrl)];
}
