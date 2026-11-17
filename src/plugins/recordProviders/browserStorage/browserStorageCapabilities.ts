import type { RecordCapabilities } from '@/core/records/RecordProvider';

/** Light data, readable without loading the provider: no provider code is imported here. */
export const BROWSER_STORAGE_CAPABILITIES: RecordCapabilities = {
  canWrite: true,
  // Nothing pushes changes: writes from another tab show up on the next read.
  canSubscribe: false,
  canSearchText: true,
  canCount: true,
};
