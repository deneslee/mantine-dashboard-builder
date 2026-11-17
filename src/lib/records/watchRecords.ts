import type { QueryClient } from '@tanstack/react-query';
import type { RecordProvider } from '@/core/records/RecordProvider';
import { recordKeys } from '@/core/records/recordKeys';

/**
 * Keeps the cached reads of a collection current: each change the provider reports invalidates the
 * collection's query keys. Returns the function that stops watching; a provider that cannot push
 * changes needs none, so it gives back a function that does nothing.
 */
export function watchRecords(queryClient: QueryClient, provider: RecordProvider, collection: string) {
  if (!provider.capabilities.canSubscribe) return () => {};
  const result = provider.subscribe(collection, () => {
    void queryClient.invalidateQueries({ queryKey: recordKeys.collection(provider.id, collection) });
  });
  return result.ok ? result.value : () => {};
}
