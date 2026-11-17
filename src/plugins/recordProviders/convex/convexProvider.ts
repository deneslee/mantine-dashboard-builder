import type { FunctionArgs, FunctionReference, FunctionReturnType } from 'convex/server';
import { api } from '../../../../convex/_generated/api';
import { AppError } from '@/core/errors/AppError';
import {
  COLLECTION_EXPORT_VERSION,
  type CollectionExport,
  type ListQuery,
  type ListResult,
  type RecordChange,
  type RecordData,
  type RecordProvider,
  type RecordResult,
  type StoredRecord,
  type WriteOptions,
} from '@/core/records/RecordProvider';
import { runListQuery } from '@/core/records/runListQuery';
import { CONVEX_CAPABILITIES } from './convexCapabilities';

/** The server's cap per collection (`MAX_RECORDS` in convex/records.ts); checked here so the user sees why. */
const MAX_RECORDS = 2000;

/** The three `ConvexClient` methods the provider uses, so a test can pass a fake. */
export interface ConvexRecordClient {
  query<Query extends FunctionReference<'query'>>(
    query: Query,
    args: FunctionArgs<Query>,
  ): Promise<FunctionReturnType<Query>>;
  mutation<Mutation extends FunctionReference<'mutation'>>(
    mutation: Mutation,
    args: FunctionArgs<Mutation>,
  ): Promise<FunctionReturnType<Mutation>>;
  onUpdate<Query extends FunctionReference<'query'>>(
    query: Query,
    args: FunctionArgs<Query>,
    callback: (result: FunctionReturnType<Query>) => unknown,
    onError?: (error: Error) => unknown,
  ): () => void;
}

export interface ConvexProviderOptions {
  client: ConvexRecordClient;
  id?: string;
}

interface WireRecord {
  id: string;
  revision: number;
  data: string;
}

const ok = <T>(value: T): RecordResult<T> => ({ ok: true, value });

const fromWire = (record: WireRecord): StoredRecord => ({
  id: record.id,
  revision: record.revision,
  data: JSON.parse(record.data) as RecordData,
});

/** A Convex call that failed is the storage failing: an `AppError` the UI understands. */
async function call<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (cause) {
    if (cause instanceof AppError) throw cause;
    throw new AppError('unknown', 'Convex could not complete the request.', { cause });
  }
}

/**
 * Records on Convex: one live query per collection, and the contract's filters, sort and paging run
 * here on that result, with the same function the browser provider uses. Writes check revisions inside
 * the mutation. Needs only a client with `query`, `mutation` and `onUpdate`.
 */
export function createConvexProvider({ client, id = 'convex' }: ConvexProviderOptions): RecordProvider {
  async function readAll(collection: string): Promise<StoredRecord[]> {
    const { records, isTruncated } = await call(() =>
      client.query(api.records.listCollection, { collection }),
    );
    if (isTruncated)
      throw new AppError('validation', `The "${collection}" collection is too large to read at once.`);
    return records.map(fromWire);
  }

  return {
    id,
    capabilities: CONVEX_CAPABILITIES,

    async list<T extends RecordData>(collection: string, query: ListQuery = {}) {
      return ok(runListQuery(await readAll(collection), query) as ListResult<T>);
    },

    async get<T extends RecordData>(collection: string, recordId: string) {
      const record = await call(() => client.query(api.records.get, { collection, recordId }));
      return record ? ok(fromWire(record) as StoredRecord<T>) : { ok: false, reason: 'notFound' };
    },

    async create<T extends RecordData>(collection: string, data: T, options: { id?: string } = {}) {
      const result = await call(() =>
        client.mutation(api.records.create, {
          collection,
          recordId: options.id ?? crypto.randomUUID(),
          data: JSON.stringify(data),
        }),
      );
      if (!result.ok) return { ok: false, reason: 'conflict', current: fromWire(result.current) };
      return ok(fromWire(result.record) as StoredRecord<T>);
    },

    async update<T extends RecordData>(
      collection: string,
      recordId: string,
      patch: Partial<T>,
      options: WriteOptions = {},
    ) {
      const result = await call(() =>
        client.mutation(api.records.update, {
          collection,
          recordId,
          patch: JSON.stringify(patch),
          expectedRevision: options.expectedRevision,
        }),
      );
      if (result.ok) return ok(fromWire(result.record) as StoredRecord<T>);
      if (result.reason === 'notFound') return { ok: false, reason: 'notFound' };
      return { ok: false, reason: 'conflict', current: fromWire(result.current) };
    },

    async delete(collection, recordId, options: WriteOptions = {}) {
      const result = await call(() =>
        client.mutation(api.records.remove, {
          collection,
          recordId,
          expectedRevision: options.expectedRevision,
        }),
      );
      if (result.ok) return ok({ id: result.id });
      if (result.reason === 'notFound') return { ok: false, reason: 'notFound' };
      return { ok: false, reason: 'conflict', current: fromWire(result.current) };
    },

    subscribe(collection, onChange: (change: RecordChange) => void) {
      let known: Map<string, number> | undefined;
      // Errors of the watched query are logged by the Convex client; a change feed has no error channel.
      const stop = client.onUpdate(api.records.listCollection, { collection }, ({ records }) => {
        const next = new Map(records.map((record) => [record.id, record.revision]));
        const before = known;
        known = next;
        // The first result is the starting point, not a change.
        if (!before) return;
        for (const [recordId, revision] of next)
          if (before.get(recordId) !== revision) onChange({ collection, id: recordId });
        for (const recordId of before.keys()) if (!next.has(recordId)) onChange({ collection, id: recordId });
      });
      return ok(stop);
    },

    async exportCollection(collection) {
      const data: CollectionExport = {
        formatVersion: COLLECTION_EXPORT_VERSION,
        collection,
        records: await readAll(collection),
      };
      return ok(data);
    },

    async importCollection(data) {
      if (data.formatVersion !== COLLECTION_EXPORT_VERSION || !Array.isArray(data.records))
        throw new AppError('validation', 'This is not a collection export this version can read.');
      if (data.records.length > MAX_RECORDS)
        throw new AppError(
          'validation',
          `A collection holds at most ${MAX_RECORDS} records; this import has ${data.records.length}.`,
        );
      const { count } = await call(() =>
        client.mutation(api.records.importCollection, {
          collection: data.collection,
          records: data.records.map((record) => ({
            id: record.id,
            revision: record.revision,
            data: JSON.stringify(record.data),
          })),
        }),
      );
      return ok({ count });
    },
  };
}
