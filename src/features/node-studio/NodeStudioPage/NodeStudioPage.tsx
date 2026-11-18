import { useState, type FormEvent } from 'react';
import { Button, Group, Text, TextInput, Title, useComputedColorScheme } from '@mantine/core';
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  reconnectEdge,
  useEdgesState,
  useNodesData,
  useReactFlow,
  type Connection,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TableCard } from '../components/TableCard';
import { FieldSelectionContext, type FieldSelection } from '../fieldSelection';
import { TABLES, RELATIONSHIPS, type TableNode, type SchemaField } from '../schema';
import classes from './NodeStudio.module.css';

const NODE_TYPES = { table: TableCard };
const FIT_OPTIONS = { padding: 0.15, maxZoom: 1.25 };

function RenameField({ field, onRename }: { field: SchemaField; onRename: (name: string) => void }) {
  const [name, setName] = useState(field.name);
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim()) onRename(name.trim());
  }
  return (
    <form onSubmit={handleSubmit} className={classes.form}>
      <TextInput
        label="Field name"
        value={name}
        onChange={(event) => setName(event.currentTarget.value)}
        required
      />
      <Button type="submit" size="xs" disabled={!name.trim() || name.trim() === field.name}>
        Rename field
      </Button>
    </form>
  );
}

function SchemaEditor() {
  const scheme = useComputedColorScheme();
  const [edges, setEdges, handleEdgesChange] = useEdgesState(RELATIONSHIPS);
  const [selection, select] = useState<FieldSelection | null>(null);
  const [message, setMessage] = useState('');
  const { updateNodeData } = useReactFlow<TableNode>();
  const table = useNodesData<TableNode>(selection?.tableId ?? '');
  const field = table?.data.fields.find((item) => item.id === selection?.fieldId);

  function handleConnection(connection: Connection, previous?: Edge) {
    const isDuplicate = edges.some(
      (edge) =>
        edge.id !== previous?.id &&
        edge.source === connection.source &&
        edge.target === connection.target &&
        edge.sourceHandle === connection.sourceHandle &&
        edge.targetHandle === connection.targetHandle,
    );
    if (isDuplicate) {
      setMessage('These fields are already connected.');
      return;
    }
    if (previous) {
      setEdges((current) => reconnectEdge(previous, connection, current, { shouldReplaceId: false }));
      setMessage('Relationship reconnected.');
    } else {
      setEdges((current) => addEdge({ ...connection, id: crypto.randomUUID() }, current));
      setMessage('Relationship added.');
    }
  }

  function handleRename(name: string) {
    if (!table || !field) return;
    updateNodeData(table.id, {
      fields: table.data.fields.map((item) => (item.id === field.id ? { ...item, name } : item)),
    });
    setMessage('Field renamed.');
  }

  return (
    <section className={classes.studio} aria-label="Node Studio">
      <div className={classes.heading}>
        <Title order={1}>Node Studio</Title>
        <Text size="sm" c="dimmed">
          Select a field to inspect it. Drag between field handles to connect them.
        </Text>
      </div>
      <div className={classes.workspace}>
        <div className={classes.canvas}>
          <FieldSelectionContext value={{ selection, select }}>
            <ReactFlow<TableNode>
              defaultNodes={TABLES}
              edges={edges}
              onEdgesChange={handleEdgesChange}
              nodeTypes={NODE_TYPES}
              onConnect={(connection) => handleConnection(connection)}
              onReconnect={(edge, connection) => handleConnection(connection, edge)}
              onPaneClick={() => select(null)}
              deleteKeyCode={null}
              forceColorMode={scheme}
              fitView
              fitViewOptions={FIT_OPTIONS}
            >
              <Background />
              <Controls />
            </ReactFlow>
          </FieldSelectionContext>
        </div>
        <aside className={classes.inspector} aria-label="Field inspector">
          <Title order={2} size="h5">
            Field inspector
          </Title>
          {field && table ? (
            <>
              <Text size="sm" c="dimmed">
                {table.data.name} · {field.type}
                {field.isPrimary && ' · Primary key'}
              </Text>
              <RenameField
                key={`${table.id}/${field.id}/${field.name}`}
                field={field}
                onRename={handleRename}
              />
            </>
          ) : (
            <Text size="sm" c="dimmed">
              Choose a field on the canvas.
            </Text>
          )}
        </aside>
        <Group className={classes.footer} justify="space-between">
          <Text size="xs">
            {TABLES.length} tables · {edges.length} {edges.length === 1 ? 'relationship' : 'relationships'}
          </Text>
          <Text size="xs" role="status">
            {message}
          </Text>
        </Group>
      </div>
    </section>
  );
}

export function NodeStudioPage() {
  return (
    <ReactFlowProvider>
      <SchemaEditor />
    </ReactFlowProvider>
  );
}
