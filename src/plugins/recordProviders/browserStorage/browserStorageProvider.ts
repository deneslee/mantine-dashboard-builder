import { AppError } from '@/core/errors/AppError';
import { runListQuery } from '@/core/records/runListQuery';
import {
  COLLECTION_EXPORT_VERSION,
  notSupported,
  type CollectionExport,
  type ListQuery,
  type ListResult,
  type RecordData,
  type RecordFailure,
  type RecordProvider,
  type RecordResult,
  type StoredRecord,
  type WriteOptions,
} from '@/core/records/RecordProvider';
import { BROWSER_STORAGE_CAPABILITIES } from './browserStorageCapabilities';

export interface BrowserStorageProviderOptions {
  /** Where the records go: `localStorage` in the app. */
  storage: Storage;
  /** The storage key for a name: `storageKey` from `@/lib/storage` in the app. */
  keyFor: (name: string) => string;
  id?: string;
}

/** A collection as stored: one key per collection, its version in the value. */
interface StoredCollection {
  version: 1;
  records: StoredRecord[];
}

const ok = <T>(value: T): RecordResult<T> => ({ ok: true, value });

/**
 * Records in browser storage, one key per collection. Storage and key naming are passed in, so this
 * needs nothing from `lib/`. Reads and writes are synchronous underneath, so each operation is atomic
 * within a tab; revisions catch edits that collide across tabs or across two open forms.
 */
export function createBrowserStorageProvider({
  storage,
  keyFor,
  id: providerId = 'browser',
}: BrowserStorageProviderOptions): RecordProvider {
  const keyOf = (collection: string) => keyFor(`records:${collection}`);

  function read(collection: string): StoredRecord[] {
    const raw = storage.getItem(keyOf(collection));
    if (raw === null) return [];
    try {
      const stored = JSON.parse(raw) as StoredCollection;
      if (stored.version === 1 && Array.isArray(stored.records)) return stored.records;
    } catch {
      // Falls through to the error below.
    }
    throw new AppError('validation', `The stored "${collection}" records cannot be read.`);
  }

  function write(collection: string, records: StoredRecord[]) {
    const stored: StoredCollection = { version: 1, records };
    try {
      storage.setItem(keyOf(collection), JSON.stringify(stored));
    } catch (cause) {
      throw new AppError('unknown', 'Browser storage is full or unavailable; the change was not saved.', {
        cause,
      });
    }
  }

  /** Finds the record a write is about, or the reason the write is refused. */
  function findForWrite(
    records: StoredRecord[],
    id: string,
    expectedRevision: number | undefined,
  ): { index: number; current: StoredRecord; failure?: undefined } | { failure: RecordFailure } {
    const index = records.findIndex((record) => record.id === id);
    const current = records[index];
    if (!current) return { failure: { ok: false, reason: 'notFound' } };
    if (expectedRevision !== undefined && expectedRevision !== current.revision)
      return { failure: { ok: false, reason: 'conflict', current } };
    return { index, current };
  }

  return {
    id: providerId,
    capabilities: BROWSER_STORAGE_CAPABILITIES,

    async list<T extends RecordData>(collection: string, query: ListQuery = {}) {
      return ok(runListQuery(read(collection), query) as ListResult<T>);
    },

    async get<T extends RecordData>(collection: string, id: string) {
      const record = read(collection).find((r) => r.id === id);
      return record ? ok(record as StoredRecord<T>) : { ok: false, reason: 'notFound' };
    },

    async create<T extends RecordData>(collection: string, data: T, options: { id?: string } = {}) {
      const records = read(collection);
      const id = options.id ?? crypto.randomUUID();
      const taken = records.find((r) => r.id === id);
      if (taken) return { ok: false, reason: 'conflict', current: taken };
      const record: StoredRecord<T> = { id, revision: 1, data };
      write(collection, [...records, record]);
      return ok(record);
    },

    async update<T extends RecordData>(
      collection: string,
      id: string,
      patch: Partial<T>,
      options: WriteOptions = {},
    ) {
      const records = read(collection);
      const found = findForWrite(records, id, options.expectedRevision);
      if (found.failure) return found.failure;
      const record: StoredRecord = {
        id,
        revision: found.current.revision + 1,
        data: { ...found.current.data, ...patch },
      };
      write(collection, records.with(found.index, record));
      return ok(record as StoredRecord<T>);
    },

    async delete(collection, id, options: WriteOptions = {}) {
      const records = read(collection);
      const found = findForWrite(records, id, options.expectedRevision);
      if (found.failure) return found.failure;
      write(collection, records.toSpliced(found.index, 1));
      return ok({ id });
    },

    subscribe() {
      return notSupported('subscribe');
    },

    async exportCollection(collection) {
      const data: CollectionExport = {
        formatVersion: COLLECTION_EXPORT_VERSION,
        collection,
        records: read(collection),
      };
      return ok(data);
    },

    async importCollection(data) {
      if (data.formatVersion !== COLLECTION_EXPORT_VERSION || !Array.isArray(data.records))
        throw new AppError('validation', 'This is not a collection export this version can read.');
      if (new Set(data.records.map((record) => record.id)).size !== data.records.length)
        throw new AppError('validation', 'The export holds the same record id twice.');
      // A collection that cannot be read counts as empty: the import replaces it.
      let previousMax = 0;
      try {
        previousMax = Math.max(0, ...read(data.collection).map((record) => record.revision));
      } catch {
        previousMax = 0;
      }
      // One key per collection, so this is one `setItem`: it lands whole or, when the storage refuses,
      // not at all and the collection stays as it was.
      write(
        data.collection,
        data.records.map((record) => ({ ...record, revision: previousMax + record.revision })),
      );
      return ok({ count: data.records.length });
    },

    async checkStatus() {
      const key = keyFor('records-probe');
      try {
        storage.setItem(key, 'probe');
        const isReadable = storage.getItem(key) === 'probe';
        storage.removeItem(key);
        if (!isReadable) return { state: 'failed', message: 'This browser did not keep what was written.' };
        return { state: 'ready', message: 'Saving in this browser works.' };
      } catch {
        return { state: 'failed', message: 'Browser storage is full or unavailable.' };
      }
    },
  };
}
