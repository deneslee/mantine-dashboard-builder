import type { ListQuery } from './RecordProvider';

/**
 * Every query key for records, general to specific: provider, collection, kind of read, parameters.
 * A shorter key is a prefix of the longer ones, so invalidating `lists(…)` refreshes every list of a
 * collection in one step.
 */
export const recordKeys = {
  all: ['records'] as const,
  provider: (provider: string) => ['records', provider] as const,
  collection: (provider: string, collection: string) => ['records', provider, collection] as const,
  lists: (provider: string, collection: string) => ['records', provider, collection, 'list'] as const,
  list: (provider: string, collection: string, query: ListQuery = {}) =>
    ['records', provider, collection, 'list', query] as const,
  ones: (provider: string, collection: string) => ['records', provider, collection, 'one'] as const,
  one: (provider: string, collection: string, id: string) =>
    ['records', provider, collection, 'one', id] as const,
};

export type RecordWrite =
  | { operation: 'create' }
  | { operation: 'update' | 'delete'; id: string }
  | { operation: 'import' };

/** What a write makes stale: the key prefixes to invalidate after it. */
export function staleKeys(provider: string, collection: string, write: RecordWrite) {
  switch (write.operation) {
    case 'create':
      return [recordKeys.lists(provider, collection)];
    case 'update':
    case 'delete':
      return [recordKeys.lists(provider, collection), recordKeys.one(provider, collection, write.id)];
    case 'import':
      return [recordKeys.collection(provider, collection)];
  }
}
