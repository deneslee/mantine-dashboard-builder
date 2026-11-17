import { useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import type { CollectionExport, RecordProvider, RecordProviderStatus } from '@/core/records/RecordProvider';
import { configureRecordProviders } from '@/lib/records/activeRecordProvider';
import { storageKey } from '@/lib/storage';
import { PluginsContext, type Plugins } from '@/plugins/usePlugins';
import type { StorageCollection } from '@/features/storage/collections';
import { TestRouter } from './TestRouter';

/** A place for a Storage story: what it is called, its status, and how many records it holds. */
export interface StoryPlace {
  id: string;
  name: string;
  description: string;
  note?: string;
  /** `'checking'` never answers, so the page stays on "Checking…". */
  status: RecordProviderStatus | 'checking';
  count?: number;
  /** Holds back `importCollection` until it resolves, to show "Waiting for … to confirm…". */
  heldImport?: Promise<void>;
}

/** The one collection the Storage stories use; any record is valid. */
export const storyCollections: StorageCollection[] = [
  { id: 'dashboards', label: 'Dashboards', singular: 'dashboard', validate: () => [] },
];

function fakeProvider(place: StoryPlace): RecordProvider {
  const count = place.count ?? 3;
  const records = Array.from({ length: count }, (_, i) => ({ id: `d${i + 1}`, revision: 1, data: {} }));
  return {
    id: place.id,
    capabilities: { canWrite: true, canSubscribe: false, canSearchText: false, canCount: true },
    list: async () => ({ ok: true, value: { records: records.slice(0, 1), total: count } }),
    exportCollection: async (collection: string) => ({
      ok: true,
      value: { formatVersion: 1, collection, records },
    }),
    importCollection: async (data: CollectionExport) => {
      await place.heldImport;
      return { ok: true, value: { count: data.records.length } };
    },
    checkStatus: () =>
      place.status === 'checking' ? new Promise<never>(() => {}) : Promise.resolve(place.status),
  } as unknown as RecordProvider;
}

/**
 * Storage pages in a story: fake places with the given statuses behind the real registry shape, in a
 * test router. `active` is the place in use.
 */
export function StorageStory({
  places,
  active = places[0]?.id ?? 'browser',
  stored = active,
  children,
}: {
  places: StoryPlace[];
  active?: string;
  /** What the setting holds, when that is not a place in `places` (a fallback). */
  stored?: string;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [plugins] = useState<Plugins>(() => {
    queryClient.clear();
    configureRecordProviders(
      Object.fromEntries(
        places.map((place) => [place.id, { name: place.name, load: async () => fakeProvider(place) }]),
      ),
    );
    localStorage.setItem(storageKey('record-provider'), JSON.stringify({ version: 1, id: stored }));
    return {
      widgets: {},
      datasources: {},
      types: {},
      recordProviders: Object.fromEntries(
        places.map((place) => [
          place.id,
          {
            id: place.id,
            name: place.name,
            description: place.description,
            note: place.note,
            capabilities: { canWrite: true, canSubscribe: false, canSearchText: false, canCount: true },
            load: async () => fakeProvider(place),
          },
        ]),
      ),
      panels: {},
      actions: {},
      build: { catalog: [] },
    };
  });
  return (
    <PluginsContext value={plugins}>
      <TestRouter path="/storage" page={children} />
    </PluginsContext>
  );
}
