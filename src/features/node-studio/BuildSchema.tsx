import { useState } from 'react';
import { Group, Text } from '@mantine/core';
import { BuildCanvas } from './BuildCanvas';
import { FieldInspector } from './components/FieldInspector';
import { findField, type FieldEndpoint, type Schema } from './model/schema';
import type { SchemaEdit } from './model/schemaEdits';
import classes from './BuildSchema.module.css';

interface BuildSchemaProps {
  schema: Schema;
  message: string;
  onEdit: (edit: SchemaEdit) => void;
}

export function BuildSchema({ schema, message, onEdit }: BuildSchemaProps) {
  const [selection, select] = useState<FieldEndpoint | null>(null);
  const selectedField = selection ? findField(schema, selection) : undefined;
  const relationshipCount = schema.relationships.length;

  return (
    <div className={classes.workspace}>
      <div className={classes.canvas}>
        <BuildCanvas schema={schema} selection={selection} onSelectField={select} onEdit={onEdit} />
      </div>
      <FieldInspector
        selectedField={selectedField}
        onRename={(endpoint, name) => onEdit({ type: 'rename', endpoint, name })}
      />
      <Group className={classes.footer} justify="space-between">
        <Text size="xs">
          {schema.tables.length} tables · {relationshipCount}{' '}
          {relationshipCount === 1 ? 'relationship' : 'relationships'}
        </Text>
        <Text size="xs" role="status">
          {message}
        </Text>
      </Group>
    </div>
  );
}
