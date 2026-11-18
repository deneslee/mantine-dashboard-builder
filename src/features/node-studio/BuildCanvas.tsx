import { useEffect, useMemo, useState } from 'react';
import { useComputedColorScheme } from '@mantine/core';
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type OnEdgesChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TableCard } from './components/TableCard';
import { SelectFieldContext } from './fieldSelection';
import { getRelationship, getRelationshipEdge, getTableNodes, type TableNode } from './graph/buildGraph';
import type { FieldEndpoint, Schema } from './model/schema';
import type { SchemaEdit } from './model/schemaEdits';

const NODE_TYPES = { table: TableCard };
const FIT_OPTIONS = { padding: 0.15, maxZoom: 1.25 };

interface BuildCanvasProps {
  schema: Schema;
  selection: FieldEndpoint | null;
  onSelectField: (field: FieldEndpoint | null) => void;
  onEdit: (edit: SchemaEdit) => void;
}

function FlowCanvas({ schema, selection, onSelectField, onEdit }: BuildCanvasProps) {
  const scheme = useComputedColorScheme();
  const [initialNodes] = useState(() => getTableNodes(schema.tables));
  const { setNodes } = useReactFlow<TableNode>();
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    // Each mounted sample has fixed topology. XYFlow owns its live positions and viewport.
    const tables = new Map(schema.tables.map((table) => [table.id, table]));
    setNodes((nodes) =>
      nodes.map((node) => {
        const table = tables.get(node.id);
        const selectedFieldId = selection?.tableId === node.id ? selection.fieldId : undefined;
        if (!table || (table === node.data.table && selectedFieldId === node.data.selectedFieldId))
          return node;
        return { ...node, data: { table, selectedFieldId } };
      }),
    );
  }, [schema.tables, selection, setNodes]);

  const edges = useMemo(
    () =>
      schema.relationships.map((relationship) =>
        getRelationshipEdge(relationship, selectedEdgeIds.has(relationship.id)),
      ),
    [schema.relationships, selectedEdgeIds],
  );

  const handleEdgesChange: OnEdgesChange = (changes) => {
    // Selection is canvas state. Relationship edits go through the schema commands.
    const selected = changes.applyTo(edges).filter((edge) => edge.selected);
    setSelectedEdgeIds((current) =>
      current.size === selected.length && selected.every(({ id }) => current.has(id))
        ? current
        : new Set(selected.map(({ id }) => id)),
    );
  };

  function handleConnection(connection: Connection, edgeId?: string) {
    const relationship = getRelationship(connection, edgeId ?? crypto.randomUUID());
    if (relationship) onEdit({ type: edgeId === undefined ? 'connect' : 'reconnect', relationship });
  }

  return (
    <SelectFieldContext value={onSelectField}>
      <ReactFlow<TableNode>
        defaultNodes={initialNodes}
        edges={edges}
        onEdgesChange={handleEdgesChange}
        nodeTypes={NODE_TYPES}
        onConnect={handleConnection}
        onReconnect={(edge, connection) => handleConnection(connection, edge.id)}
        onPaneClick={() => onSelectField(null)}
        deleteKeyCode={null}
        forceColorMode={scheme}
        fitView
        fitViewOptions={FIT_OPTIONS}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </SelectFieldContext>
  );
}

export function BuildCanvas(props: BuildCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvas {...props} />
    </ReactFlowProvider>
  );
}
