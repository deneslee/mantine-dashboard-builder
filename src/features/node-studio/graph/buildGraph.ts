import type { Connection, Edge, Node } from '@xyflow/react';
import type { Relationship, SchemaTable } from '../model/schema';

export type TableNode = Node<{ table: SchemaTable; selectedFieldId?: string }, 'table'>;

const COLUMN_SPACING = 360;
const ROW_SPACING = 240;
const COMPACT_ROW_OFFSET = 47;
const GRID_COLUMNS = 4;
const HANDLE_PREFIX = { source: 'out:', target: 'in:' };

export function fieldHandleId(role: keyof typeof HANDLE_PREFIX, fieldId: string) {
  return HANDLE_PREFIX[role] + fieldId;
}

function readFieldHandle(role: keyof typeof HANDLE_PREFIX, value: string | null) {
  const prefix = HANDLE_PREFIX[role];
  return value?.startsWith(prefix) ? value.slice(prefix.length) : undefined;
}

export function getTableNodes(tables: SchemaTable[]): TableNode[] {
  return tables.map((table, index) => ({
    id: table.id,
    type: 'table',
    position:
      tables.length === 2
        ? { x: index * COLUMN_SPACING, y: index * COMPACT_ROW_OFFSET }
        : { x: (index % GRID_COLUMNS) * COLUMN_SPACING, y: Math.floor(index / GRID_COLUMNS) * ROW_SPACING },
    data: { table },
  }));
}

export function getRelationshipEdge(relationship: Relationship, selected: boolean): Edge {
  return {
    id: relationship.id,
    source: relationship.source.tableId,
    sourceHandle: fieldHandleId('source', relationship.source.fieldId),
    target: relationship.target.tableId,
    targetHandle: fieldHandleId('target', relationship.target.fieldId),
    selected,
  };
}

export function getRelationship(connection: Connection, id: string): Relationship | undefined {
  const { source, sourceHandle, target, targetHandle } = connection;
  const sourceField = readFieldHandle('source', sourceHandle);
  const targetField = readFieldHandle('target', targetHandle);
  if (!sourceField || !targetField) return;

  return {
    id,
    source: { tableId: source, fieldId: sourceField },
    target: { tableId: target, fieldId: targetField },
  };
}
