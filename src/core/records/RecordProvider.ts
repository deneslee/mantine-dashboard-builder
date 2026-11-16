/**
 * The record provider contract (docs/target/contracts.md, section 3): how editable rows are read and
 * written, whatever stores them. Features use this, never Convex or browser storage directly.
 */

/** A record's own fields: JSON values only, so a record can be stored, exported and put in a query key. */
export type RecordData = Record<string, unknown>;

export interface StoredRecord<T extends RecordData = RecordData> {
  /** Unique within its collection, fixed once created. */
  id: string;
  /** Starts at 1 and goes up by one on every write; `expectedRevision` is checked against it. */
  revision: number;
  data: T;
}

export type FilterOperator = 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'in' | 'contains';

export interface ListFilter {
  /** `id`, or a field of the record's `data`. */
  field: string;
  operator: FilterOperator;
  /** A JSON value; an array for `in`. */
  value: unknown;
}

export interface ListSort {
  /** `id`, or a field of the record's `data`. */
  field: string;
  direction: 'asc' | 'desc';
}

/** What a list asks for. Plain JSON, so it is the "parameters" part of the query key as it is. */
export interface ListQuery {
  /** Free-text search over the record's text fields. */
  text?: string;
  /** All filters must match. */
  filters?: ListFilter[];
  /** Applied in order; ties are broken by id, so paging is stable. */
  sort?: ListSort[];
  /** `cursor` is a previous result's `nextCursor`; without it the first page is returned. */
  page?: { size: number; cursor?: string };
}

export interface ListResult<T extends RecordData = RecordData> {
  records: StoredRecord<T>[];
  /** Absent on the last page. */
  nextCursor?: string;
  /** How many records match, on all pages. Only from a provider with `canCount`. */
  total?: number;
}

export const RECORD_OPERATIONS = [
  'list',
  'get',
  'create',
  'update',
  'delete',
  'subscribe',
  'export',
  'import',
] as const;

export type RecordOperation = (typeof RECORD_OPERATIONS)[number];

/** What a provider supports. Light data, so it can be shown without loading the provider's code. */
export interface RecordCapabilities {
  /** Create, update, delete and import. A read-only provider says `false`. */
  canWrite: boolean;
  /** Pushes changes: `subscribe` works, and the provider keeps the cache up to date itself. */
  canSubscribe: boolean;
  /** Honours `ListQuery.text`. */
  canSearchText: boolean;
  /** Returns `ListResult.total`. */
  canCount: boolean;
}

export type RecordFailure =
  /** The provider does not support the operation; nothing happened. */
  | { ok: false; reason: 'notSupported'; operation: RecordOperation }
  | { ok: false; reason: 'notFound' }
  /**
   * Refused: the record changed since `expectedRevision` (or, on create, the id is taken). `current`
   * is the record as it is now; for a delete that lost to another delete the result is `notFound`.
   */
  | { ok: false; reason: 'conflict'; current: StoredRecord };

/**
 * What every operation gives back. The outcomes a caller has to handle are values, not exceptions;
 * a provider throws (an `AppError`) only when the storage itself fails.
 */
export type RecordResult<T> = { ok: true; value: T } | RecordFailure;

export interface WriteOptions {
  /**
   * The revision the edit was based on. When the stored record has another one, the write is refused
   * with a `conflict`. Left out, the write overwrites.
   */
  expectedRevision?: number;
}

/** A whole collection as data: how records move when the user switches storage. */
export interface CollectionExport {
  formatVersion: 1;
  collection: string;
  records: StoredRecord[];
}

export const COLLECTION_EXPORT_VERSION = 1;

export interface RecordChange {
  collection: string;
  /** The record that changed; absent when the whole collection did (an import). */
  id?: string;
}

/**
 * One place records are stored. Every method exists on every provider: one it does not support
 * resolves with `{ ok: false, reason: 'notSupported' }` and does nothing, as `capabilities` announces.
 */
export interface RecordProvider {
  /** The first part of every query key of this provider, e.g. `browser`. */
  id: string;
  capabilities: RecordCapabilities;
  list<T extends RecordData = RecordData>(
    collection: string,
    query?: ListQuery,
    signal?: AbortSignal,
  ): Promise<RecordResult<ListResult<T>>>;
  get<T extends RecordData = RecordData>(
    collection: string,
    id: string,
    signal?: AbortSignal,
  ): Promise<RecordResult<StoredRecord<T>>>;
  /** `options.id` names the new record; a taken id is a `conflict`. Without it the provider makes one. */
  create<T extends RecordData = RecordData>(
    collection: string,
    data: T,
    options?: { id?: string },
  ): Promise<RecordResult<StoredRecord<T>>>;
  /** Merges `patch` into the record's data (top-level fields) and returns the record as stored. */
  update<T extends RecordData = RecordData>(
    collection: string,
    id: string,
    patch: Partial<T>,
    options?: WriteOptions,
  ): Promise<RecordResult<StoredRecord<T>>>;
  delete(collection: string, id: string, options?: WriteOptions): Promise<RecordResult<{ id: string }>>;
  /** Calls `onChange` after each change to the collection; the value is the function that stops it. */
  subscribe(collection: string, onChange: (change: RecordChange) => void): RecordResult<() => void>;
  exportCollection(collection: string, signal?: AbortSignal): Promise<RecordResult<CollectionExport>>;
  /**
   * Replaces the collection named in `data` with its records, ids and revisions kept, so an export
   * followed by an import gives the same records.
   */
  importCollection(data: CollectionExport): Promise<RecordResult<{ count: number }>>;
}

export function notSupported(operation: RecordOperation): RecordFailure {
  return { ok: false, reason: 'notSupported', operation };
}

/**
 * A collection's fields as JSON Schema, draft 2020-12: an object schema whose `properties` are the
 * fields. Hints for the UI use the standard `title` and `description`, or `x-` keywords.
 */
export interface FieldsSchema {
  $schema?: typeof JSON_SCHEMA_DIALECT;
  type: 'object';
  properties: Record<string, Record<string, unknown>>;
  required?: string[];
  [keyword: string]: unknown;
}

export const JSON_SCHEMA_DIALECT = 'https://json-schema.org/draft/2020-12/schema';

/**
 * A collection described as data. Definitions are stored like records, in the collection
 * `DEFINITIONS_COLLECTION` with the described collection's id as the record id. Nothing checks a
 * record against `fields` yet.
 */
export interface CollectionDefinition extends RecordData {
  id: string;
  name: string;
  /** Goes up when `fields` changes in a way stored records must be upgraded for. */
  schemaVersion: number;
  fields: FieldsSchema;
}

export const DEFINITIONS_COLLECTION = 'collections';
