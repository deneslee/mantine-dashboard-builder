import type { RecordProviderPlugin } from '@/plugins/RecordProviderPlugin';
import { storageKey } from '@/lib/storage';
import {
  createBrowserStorageProvider,
  BROWSER_STORAGE_CAPABILITIES,
} from '@/plugins/recordProviders/browserStorage/browserStorageProvider';
import { createConvexRecordProviderPlugin } from '@/plugins/recordProviders/convex/convexRecordProviderPlugin';

const browserProvider: RecordProviderPlugin = {
  id: 'browser',
  name: 'This browser',
  description: 'Saves records in this browser only. Nothing leaves your device.',
  capabilities: BROWSER_STORAGE_CAPABILITIES,
  load: async () => createBrowserStorageProvider({ storage: localStorage, keyFor: storageKey }),
};

/**
 * The places records can be saved. Convex is built in, but listed only when `VITE_CONVEX_URL` names a
 * deployment.
 */
export function createRecordProviders(convexUrl: string | undefined = import.meta.env.VITE_CONVEX_URL) {
  return convexUrl ? [browserProvider, createConvexRecordProviderPlugin(convexUrl)] : [browserProvider];
}
