import { useState, type FormEvent } from 'react';
import { Button, Text, TextInput, Title } from '@mantine/core';
import type { FieldEndpoint, SchemaField, SchemaTable } from '../model/schema';
import classes from './FieldInspector.module.css';

function RenameField({ field, onRename }: { field: SchemaField; onRename: (name: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? field.name;
  const normalized = name.trim();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!normalized || normalized === field.name) return;
    onRename(normalized);
    setDraft(null);
  }

  return (
    <form onSubmit={handleSubmit} className={classes.form}>
      <TextInput
        label="Field name"
        value={name}
        onChange={(event) => setDraft(event.currentTarget.value)}
        required
      />
      <Button type="submit" size="xs" disabled={!normalized || normalized === field.name}>
        Rename field
      </Button>
    </form>
  );
}

interface FieldInspectorProps {
  selectedField: { table: SchemaTable; field: SchemaField } | undefined;
  onRename: (endpoint: FieldEndpoint, name: string) => void;
}

export function FieldInspector({ selectedField, onRename }: FieldInspectorProps) {
  return (
    <aside className={classes.inspector} aria-label="Field inspector">
      <Title order={2} size="h5">
        Field inspector
      </Title>
      {selectedField ? (
        <>
          <Text size="sm" c="dimmed">
            {selectedField.table.name}
            {selectedField.field.type && ` · ${selectedField.field.type}`}
            {selectedField.field.isPrimary && ' · Primary key'}
          </Text>
          <RenameField
            key={JSON.stringify([selectedField.table.id, selectedField.field.id])}
            field={selectedField.field}
            onRename={(name) =>
              onRename({ tableId: selectedField.table.id, fieldId: selectedField.field.id }, name)
            }
          />
        </>
      ) : (
        <Text size="sm" c="dimmed">
          Choose a field on the canvas.
        </Text>
      )}
    </aside>
  );
}
