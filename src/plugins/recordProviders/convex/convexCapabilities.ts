import type { RecordCapabilities } from '@/core/records/RecordProvider';

/** Light data, readable without loading the provider: no Convex import here. */
export const CONVEX_CAPABILITIES: RecordCapabilities = {
  canWrite: true,
  canSubscribe: true,
  canSearchText: true,
  canCount: true,
};
