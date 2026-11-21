import type { RecordCapabilities, RecordProvider } from '@/core/records/RecordProvider';

/** A setting the user gives a place, e.g. a deployment URL: shown as a form on the place's page. */
export interface RecordProviderSetup {
  label: string;
  description: string;
  placeholder: string;
  /** Null when `value` is acceptable, else what to fix. */
  validate: (value: string) => string | null;
  /** Proves `value` works without saving it. Resolves with what the place says; rejects with an `AppError`. */
  test: (value: string, signal?: AbortSignal) => Promise<string>;
}

/**
 * A place records are stored, as the app lists it: light data that is always loaded, and the
 * provider's code behind `load`. `app/plugins.ts` will collect them; the active one is a user setting.
 */
export interface RecordProviderPlugin {
  /** The provider's id, e.g. `browser`: the first part of its query keys and what the setting stores. */
  id: string;
  name: string;
  description: string;
  /** A caution shown on the place's page, e.g. that nothing signs readers in yet. */
  note?: string;
  /** The same as the loaded provider's `capabilities`, readable without loading it. */
  capabilities: RecordCapabilities;
  /** Present when the place needs a setting before it works. */
  setup?: RecordProviderSetup;
  /** False while the place lacks its setting; its status then reads "Not set up" and `load` is not called. */
  isConfigured?: () => boolean;
  load: () => Promise<RecordProvider>;
}
