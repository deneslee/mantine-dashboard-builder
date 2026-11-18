export interface SchemaField {
  id: string;
  name: string;
  type?: string;
  isPrimary?: boolean;
}

export interface SchemaTable {
  id: string;
  name: string;
  fields: SchemaField[];
}

export interface FieldEndpoint {
  tableId: string;
  fieldId: string;
}

export interface Relationship {
  id: string;
  source: FieldEndpoint;
  target: FieldEndpoint;
}

export interface Schema {
  tables: SchemaTable[];
  relationships: Relationship[];
}
export function findField(schema: Schema, { tableId, fieldId }: FieldEndpoint) {
  const table = schema.tables.find((item) => item.id === tableId);
  const field = table?.fields.find((item) => item.id === fieldId);
  return table && field ? { table, field } : undefined;
}
