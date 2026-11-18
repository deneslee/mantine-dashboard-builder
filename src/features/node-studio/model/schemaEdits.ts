import { findField, type FieldEndpoint, type Relationship, type Schema } from './schema';

export type SchemaEdit =
  | { type: 'rename'; endpoint: FieldEndpoint; name: string }
  | { type: 'connect' | 'reconnect'; relationship: Relationship };

export function getRelationshipError(schema: Schema, relationship: Relationship): string | undefined {
  const { id, source, target } = relationship;
  if (!findField(schema, source) || !findField(schema, target)) return 'Choose two existing fields.';
  if (
    schema.relationships.some(
      (edge) =>
        edge.id !== id &&
        edge.source.tableId === source.tableId &&
        edge.source.fieldId === source.fieldId &&
        edge.target.tableId === target.tableId &&
        edge.target.fieldId === target.fieldId,
    )
  )
    return 'These fields are already connected.';
}

function renameField(schema: Schema, endpoint: FieldEndpoint, name: string): Schema {
  const match = findField(schema, endpoint);
  const nextName = name.trim();
  if (!match || !nextName || nextName === match.field.name) return schema;
  const { table, field } = match;
  const updatedTable = {
    ...table,
    fields: table.fields.map((item) => (item === field ? { ...item, name: nextName } : item)),
  };
  return { ...schema, tables: schema.tables.map((item) => (item === table ? updatedTable : item)) };
}

export function applySchemaEdit(schema: Schema, edit: SchemaEdit): { schema: Schema; message: string } {
  if (edit.type === 'rename') {
    const updated = renameField(schema, edit.endpoint, edit.name);
    return { schema: updated, message: updated === schema ? 'Field name unchanged.' : 'Field renamed.' };
  }

  const { relationship } = edit;
  const error = getRelationshipError(schema, relationship);
  if (error) return { schema, message: error };

  const isExisting = schema.relationships.some((item) => item.id === relationship.id);
  if (edit.type === 'reconnect' && !isExisting) return { schema, message: 'Relationship no longer exists.' };
  if (edit.type === 'connect' && isExisting) return { schema, message: 'Relationship already exists.' };

  const relationships = isExisting
    ? schema.relationships.map((item) => (item.id === relationship.id ? relationship : item))
    : [...schema.relationships, relationship];
  return {
    schema: { ...schema, relationships },
    message: isExisting ? 'Relationship reconnected.' : 'Relationship added.',
  };
}
