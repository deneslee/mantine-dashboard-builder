import type { QueryClient } from '@tanstack/react-query';
import type { StoredRecord } from '@/core/records/RecordProvider';

/**
 * A collection the Storage pages can export, import and copy. `app/` passes these in: the Storage
 * feature does not know which collections exist or what their records look like.
 */
export interface StorageCollection {
  id: string;
  /** Plural, as a heading: "Dashboards". */
  label: string;
  /** "dashboard", for a count of one. */
  singular: string;
  /** What is wrong with these records, one message each; none when they are all valid. */
  validate: (records: StoredRecord[]) => string[];
  /** Called after the place's records were replaced, to refresh what the app caches of them. */
  onReplaced?: (queryClient: QueryClient, placeId: string) => void;
  /** How many records have unsaved edits kept in this browser for the place. */
  countUnsaved?: (placeId: string) => number;
}

/** "3 dashboards", "1 dashboard". */
export const countLabel = (collection: StorageCollection, count: number) =>
  `${count} ${count === 1 ? collection.singular : collection.label.toLowerCase()}`;
