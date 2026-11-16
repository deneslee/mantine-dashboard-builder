import type { RecordCapabilities, RecordProvider } from '@/core/records/RecordProvider';

/**
 * A place records are stored, as the app lists it: light data that is always loaded, and the
 * provider's code behind `load`. `app/plugins.ts` will collect them; the active one is a user setting.
 */
export interface RecordProviderPlugin {
  /** The provider's id, e.g. `browser`: the first part of its query keys and what the setting stores. */
  id: string;
  name: string;
  description: string;
  /** The same as the loaded provider's `capabilities`, readable without loading it. */
  capabilities: RecordCapabilities;
  load: () => Promise<RecordProvider>;
}
