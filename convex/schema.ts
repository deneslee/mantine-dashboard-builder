import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // One row per record. `data` is the record's fields as a JSON string: a collection's own field names
  // may start with `$` or `_` (a JSON Schema has `$schema`), which Convex does not allow as object keys.
  records: defineTable({
    collection: v.string(),
    recordId: v.string(),
    revision: v.number(),
    data: v.string(),
  }).index('by_collection_and_recordId', ['collection', 'recordId']),
});
