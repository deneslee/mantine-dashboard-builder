import { AppError } from '@/core/errors/AppError';
import {
  COLLECTION_EXPORT_VERSION,
  notSupported,
  type CollectionExport,
  type ListFilter,
  type ListQuery,
  type ListResult,
  type ListSort,
  type RecordCapabilities,
  type RecordData,
  type RecordFailure,
  type RecordProvider,
  type RecordResult,
  type StoredRecord,
  type WriteOptions,
} from '@/core/records/RecordProvider';

export const BROWSER_STORAGE_CAPABILITIES: RecordCapabilities = {
  canWrite: true,
  // Nothing pushes changes: writes from another tab show up on the next read.
  canSubscribe: false,
  canSearchText: true,
  canCount: true,
};

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

const fieldOf = (record: StoredRecord, field: string) => (field === 'id' ? record.id : record.data[field]);

const isComparable = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

/** Orders values of one type; anything else (missing, null, mixed types, objects) sorts last. */
function compareValues(a: unknown, b: unknown) {
  const isA = isComparable(a);
  const isB = isComparable(b);
  if (!isA || !isB) return Number(!isA) - Number(!isB);
  if (typeof a !== typeof b) return typeof a < typeof b ? -1 : 1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function matchesFilter(record: StoredRecord, { field, operator, value }: ListFilter) {
  const actual = fieldOf(record, field);
  const isOrdered = isComparable(actual) && typeof actual === typeof value;
  switch (operator) {
    case 'eq':
      return actual === value;
    case 'ne':
      return actual !== value;
    case 'lt':
      return isOrdered && compareValues(actual, value) < 0;
    case 'lte':
      return isOrdered && compareValues(actual, value) <= 0;
    case 'gt':
      return isOrdered && compareValues(actual, value) > 0;
    case 'gte':
      return isOrdered && compareValues(actual, value) >= 0;
    case 'in':
      return Array.isArray(value) && value.includes(actual);
    case 'contains':
      if (Array.isArray(actual)) return actual.includes(value);
      return (
        typeof actual === 'string' &&
        typeof value === 'string' &&
        actual.toLowerCase().includes(value.toLowerCase())
      );
  }
}

function matchesText(record: StoredRecord, text: string) {
  const needle = text.trim().toLowerCase();
  if (!needle) return true;
  return Object.values(record.data).some(
    (value) => typeof value === 'string' && value.toLowerCase().includes(needle),
  );
}

function compareRecords(a: StoredRecord, b: StoredRecord, sort: ListSort[]) {
  for (const { field, direction } of sort) {
    const order = compareValues(fieldOf(a, field), fieldOf(b, field));
    if (order !== 0) return direction === 'asc' ? order : -order;
  }
  return compareValues(a.id, b.id);
}

/** The cursor is the offset of the next page, as text. */
function readCursor(cursor: string | undefined) {
  if (cursor === undefined) return 0;
  const offset = Number(cursor);
  if (!Number.isInteger(offset) || offset < 0)
    throw new AppError('validation', `"${cursor}" is not a cursor from an earlier page.`);
  return offset;
}

function runListQuery(records: StoredRecord[], query: ListQuery): ListResult {
  let matches = records.filter(
    (record) =>
      (query.text === undefined || matchesText(record, query.text)) &&
      (query.filters ?? []).every((filter) => matchesFilter(record, filter)),
  );
  // Without a sort the order is the order of creation.
  if (query.sort?.length) matches = matches.toSorted((a, b) => compareRecords(a, b, query.sort!));
  const total = matches.length;
  if (!query.page) return { records: matches, total };
  const { size, cursor } = query.page;
  if (!Number.isInteger(size) || size < 1)
    throw new AppError('validation', 'A page holds at least one record.');
  const start = readCursor(cursor);
  const end = start + size;
  return {
    records: matches.slice(start, end),
    total,
    ...(end < total && { nextCursor: String(end) }),
  };
}

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
      write(data.collection, data.records);
      return ok({ count: data.records.length });
    },
  };
}
