import { v } from 'convex/values';
import type { Doc } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';

/**
 * WARNING: these functions are public and check no auth. Anyone with the deployment URL (it is in the
 * client bundle as VITE_CONVEX_URL) can read, change or delete every record. Use a deployment with
 * test data only, until the functions check the caller.
 */

/** The most records one collection may hold for a read to return them all. */
export const MAX_RECORDS = 2000;

/** A record as sent to the client: its fields stay a JSON string. */
interface WireRecord {
  id: string;
  revision: number;
  data: string;
}

const toWire = (doc: Doc<'records'>): WireRecord => ({
  id: doc.recordId,
  revision: doc.revision,
  data: doc.data,
});

function findOne(ctx: QueryCtx | MutationCtx, collection: string, recordId: string) {
  return ctx.db
    .query('records')
    .withIndex('by_collection_and_recordId', (q) => q.eq('collection', collection).eq('recordId', recordId))
    .unique();
}

const recordArg = v.object({ id: v.string(), revision: v.number(), data: v.string() });

/** Every record of a collection, oldest first, up to `MAX_RECORDS`; `isTruncated` says there were more. */
export const listCollection = query({
  args: { collection: v.string() },
  handler: async (ctx, { collection }) => {
    const docs = await ctx.db
      .query('records')
      .withIndex('by_collection_and_recordId', (q) => q.eq('collection', collection))
      .take(MAX_RECORDS + 1);
    const isTruncated = docs.length > MAX_RECORDS;
    const records = docs
      .slice(0, MAX_RECORDS)
      .sort((a, b) => a._creationTime - b._creationTime)
      .map(toWire);
    return { records, isTruncated };
  },
});

export const get = query({
  args: { collection: v.string(), recordId: v.string() },
  handler: async (ctx, { collection, recordId }) => {
    const doc = await findOne(ctx, collection, recordId);
    return doc ? toWire(doc) : null;
  },
});

export const create = mutation({
  args: { collection: v.string(), recordId: v.string(), data: v.string() },
  handler: async (ctx, { collection, recordId, data }) => {
    const taken = await findOne(ctx, collection, recordId);
    if (taken) return { ok: false as const, reason: 'conflict' as const, current: toWire(taken) };
    await ctx.db.insert('records', { collection, recordId, revision: 1, data });
    return { ok: true as const, record: { id: recordId, revision: 1, data } };
  },
});

/** Merges `patch` (a JSON string of an object) into the stored fields, top level only. */
export const update = mutation({
  args: {
    collection: v.string(),
    recordId: v.string(),
    patch: v.string(),
    expectedRevision: v.optional(v.number()),
  },
  handler: async (ctx, { collection, recordId, patch, expectedRevision }) => {
    const doc = await findOne(ctx, collection, recordId);
    if (!doc) return { ok: false as const, reason: 'notFound' as const };
    if (expectedRevision !== undefined && expectedRevision !== doc.revision)
      return { ok: false as const, reason: 'conflict' as const, current: toWire(doc) };
    const data = JSON.stringify({ ...JSON.parse(doc.data), ...JSON.parse(patch) });
    const revision = doc.revision + 1;
    await ctx.db.patch('records', doc._id, { data, revision });
    return { ok: true as const, record: { id: recordId, revision, data } };
  },
});

export const remove = mutation({
  args: { collection: v.string(), recordId: v.string(), expectedRevision: v.optional(v.number()) },
  handler: async (ctx, { collection, recordId, expectedRevision }) => {
    const doc = await findOne(ctx, collection, recordId);
    if (!doc) return { ok: false as const, reason: 'notFound' as const };
    if (expectedRevision !== undefined && expectedRevision !== doc.revision)
      return { ok: false as const, reason: 'conflict' as const, current: toWire(doc) };
    await ctx.db.delete('records', doc._id);
    return { ok: true as const, id: recordId };
  },
});

/**
 * Replaces the collection with the given records, in one transaction. Ids and data are kept; each
 * revision becomes the highest one the collection held before plus the record's own, so every
 * revision after an import is above every revision before it (an open editor's save is a conflict).
 */
export const importCollection = mutation({
  args: { collection: v.string(), records: v.array(recordArg) },
  handler: async (ctx, { collection, records }) => {
    if (records.length > MAX_RECORDS)
      throw new Error(
        `A collection holds at most ${MAX_RECORDS} records; this import has ${records.length}.`,
      );
    // Bounded read: `create` does not enforce the cap, so refuse to replace a collection that grew past it.
    const existing = await ctx.db
      .query('records')
      .withIndex('by_collection_and_recordId', (q) => q.eq('collection', collection))
      .take(MAX_RECORDS + 1);
    if (existing.length > MAX_RECORDS)
      throw new Error(
        `The "${collection}" collection holds more than ${MAX_RECORDS} records; it cannot be replaced.`,
      );
    if (new Set(records.map((record) => record.id)).size !== records.length)
      throw new Error('The import holds the same record id twice.');
    const previousMax = existing.reduce((max, doc) => Math.max(max, doc.revision), 0);
    for (const doc of existing) await ctx.db.delete('records', doc._id);
    for (const record of records)
      await ctx.db.insert('records', {
        collection,
        recordId: record.id,
        revision: previousMax + record.revision,
        data: record.data,
      });
    return { count: records.length };
  },
});
