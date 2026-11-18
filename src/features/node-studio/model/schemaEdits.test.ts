import { describe, expect, it } from 'vite-plus/test';
import { LARGE_SCHEMA, SMALL_SCHEMA } from '../fixtures/sampleSchemas';
import { applySchemaEdit, getRelationshipError } from './schemaEdits';

const original = SMALL_SCHEMA.relationships[0]!;

describe('schema edits', () => {
  it('keeps relationship endpoints and the original fixture intact when renaming a field', () => {
    const result = applySchemaEdit(SMALL_SCHEMA, {
      type: 'rename',
      endpoint: original.source,
      name: ' buyerId ',
    });
    const renamed = result.schema;
    expect(result.message).toBe('Field renamed.');
    expect(renamed.tables[0]?.fields.find((field) => field.id === original.source.fieldId)?.name).toBe(
      'buyerId',
    );
    expect(SMALL_SCHEMA.tables[0]?.fields[1]?.name).toBe('customerId');
    expect(renamed.relationships).toBe(SMALL_SCHEMA.relationships);
  });

  it('preserves the edge ID on reconnect and validates each edit against the latest schema', () => {
    const moved = { ...original, source: { ...original.source, fieldId: 'ord-billing' } };
    const reconnected = applySchemaEdit(SMALL_SCHEMA, { type: 'reconnect', relationship: moved }).schema;
    expect(reconnected.relationships).toEqual([moved]);

    const added = applySchemaEdit(reconnected, {
      type: 'connect',
      relationship: { ...original, id: 'second-connection' },
    }).schema;
    expect(added.relationships).toHaveLength(2);
    for (const edit of [
      { type: 'connect', relationship: { ...original, id: 'duplicate' } },
      { type: 'reconnect', relationship: { ...original, id: moved.id } },
    ] as const) {
      expect(applySchemaEdit(added, edit)).toEqual({
        schema: added,
        message: 'These fields are already connected.',
      });
      expect(applySchemaEdit(added, edit).schema).toBe(added);
    }
  });

  it('rejects unknown fields and stale relationships', () => {
    const invalid = { ...original, source: { tableId: 'customers', fieldId: 'ord-customer' } };
    expect(applySchemaEdit(SMALL_SCHEMA, { type: 'connect', relationship: invalid }).schema).toBe(
      SMALL_SCHEMA,
    );
    expect(
      applySchemaEdit(SMALL_SCHEMA, { type: 'reconnect', relationship: { ...original, id: 'missing' } })
        .schema,
    ).toBe(SMALL_SCHEMA);
    expect(
      applySchemaEdit(SMALL_SCHEMA, {
        type: 'rename',
        endpoint: { tableId: 'orders', fieldId: 'missing' },
        name: 'buyerId',
      }).schema,
    ).toBe(SMALL_SCHEMA);
  });

  it('provides unique IDs and valid relationship endpoints in the larger fixture', () => {
    expect(LARGE_SCHEMA.tables.length).toBeGreaterThan(SMALL_SCHEMA.tables.length);
    expect(new Set(LARGE_SCHEMA.tables.map(({ id }) => id)).size).toBe(LARGE_SCHEMA.tables.length);
    expect(new Set(LARGE_SCHEMA.relationships.map(({ id }) => id)).size).toBe(
      LARGE_SCHEMA.relationships.length,
    );
    for (const relationship of LARGE_SCHEMA.relationships) {
      expect(getRelationshipError(LARGE_SCHEMA, relationship)).toBeUndefined();
    }
  });
});
