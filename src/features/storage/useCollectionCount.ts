import { queryOptions, useQuery } from '@tanstack/react-query';
import { AppError } from '@/core/errors/AppError';
import { loadRecordProvider } from '@/lib/records/activeRecordProvider';

export const countKey = (placeId: string, collection: string) =>
  ['recordCount', placeId, collection] as const;

/**
 * How many records a place holds in a collection: the provider's own total when it can count (one
 * record is asked for), else the length of an export.
 */
export const collectionCountQuery = (placeId: string, collection: string) =>
  queryOptions({
    queryKey: countKey(placeId, collection),
    queryFn: async (): Promise<number> => {
      const provider = await loadRecordProvider(placeId);
      if (provider.capabilities.canCount) {
        const listed = await provider.list(collection, { page: { size: 1 } });
        if (listed.ok && listed.value.total !== undefined) return listed.value.total;
      }
      const exported = await provider.exportCollection(collection);
      if (!exported.ok) throw new AppError('unknown', 'This place cannot count its records.');
      return exported.value.records.length;
    },
    staleTime: 30_000,
    retry: false,
    meta: { source: 'Storage' },
  });

/** A collection's count in a place; asks only when `isEnabled` (the place is ready). */
export function useCollectionCount(placeId: string, collection: string, isEnabled: boolean) {
  return useQuery({ ...collectionCountQuery(placeId, collection), enabled: isEnabled });
}
