import { describe, expect, it } from 'vite-plus/test';
import { getRelationship, getRelationshipEdge } from './buildGraph';

describe('Build graph handles', () => {
  const relationship = {
    id: 'customer-order',
    source: { tableId: 'orders', fieldId: 'customer:id' },
    target: { tableId: 'customers', fieldId: 'id' },
  };
  const edge = getRelationshipEdge(relationship, false);
  const connection = {
    source: edge.source,
    sourceHandle: edge.sourceHandle ?? null,
    target: edge.target,
    targetHandle: edge.targetHandle ?? null,
  };

  it('round trips stable field IDs, including embedded colons', () => {
    expect(getRelationship(connection, relationship.id)).toEqual(relationship);
  });

  it('rejects empty and reversed handles', () => {
    expect(getRelationship({ ...connection, sourceHandle: 'out:' }, relationship.id)).toBeUndefined();
    expect(getRelationship({ ...connection, targetHandle: 'out:id' }, relationship.id)).toBeUndefined();
  });
});
