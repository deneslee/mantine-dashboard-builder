import { Group, List, Select, Stack, Text, useComputedColorScheme, useMantineTheme } from '@mantine/core';
import { useElementSize, useReducedMotion } from '@mantine/hooks';
import { useMemo, useRef, useState } from 'react';
import ForceGraph, { type ForceGraphMethods } from 'react-force-graph-2d';
import { color, fontWeight } from '@/ui/tokens/semantic';
import {
  getNeighborhood,
  projectExploreGraph,
  type ExploreLink,
  type ExploreNode,
} from './graph/exploreGraph';
import type { Schema } from './model/schema';
import classes from './ExploreSchema.module.css';

const NODE_RADIUS = 4;
const FIT_PADDING = 48;

export function ExploreSchema({ schema }: { schema: Schema }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { ref, width, height } = useElementSize<HTMLDivElement>();
  const graph = useRef<ForceGraphMethods<ExploreNode, ExploreLink>>(undefined);
  const hasFitted = useRef(false);
  const scheme = useComputedColorScheme();
  const { fontFamily } = useMantineTheme();
  const prefersReducedMotion = useReducedMotion();

  const { tables, relationships, graphData, formatEndpoint } = useMemo(
    () => projectExploreGraph(schema),
    [schema],
  );
  const activeId = hoveredId ?? selectedId;
  const active = getNeighborhood(relationships, activeId);
  const selected = activeId === selectedId ? active : getNeighborhood(relationships, selectedId);

  function handleEngineStop() {
    if (hasFitted.current || !graph.current) return;
    graph.current.zoomToFit(0, FIT_PADDING);
    hasFitted.current = true;
  }

  if (schema.tables.length === 0) {
    return <Text c="dimmed">No tables to explore.</Text>;
  }

  return (
    <Stack gap="sm">
      <Group align="end" justify="space-between">
        <Select
          label="Explore a table"
          placeholder="Choose or click a table"
          data={schema.tables.map(({ id, name }) => ({ value: id, label: name }))}
          value={selectedId}
          onChange={setSelectedId}
          searchable
          clearable
          clearButtonProps={{ 'aria-label': 'Clear table selection', 'aria-hidden': false, tabIndex: 0 }}
          nothingFoundMessage="No matching tables"
        />
        <Text size="sm" c="dimmed">
          {schema.tables.length} {schema.tables.length === 1 ? 'table' : 'tables'} · {relationships.length}{' '}
          {relationships.length === 1 ? 'relationship' : 'relationships'}
        </Text>
      </Group>
      <div className={classes.canvas} ref={ref} aria-hidden="true">
        {width > 0 && height > 0 && (
          <ForceGraph<ExploreNode, ExploreLink>
            ref={graph}
            graphData={graphData}
            width={width}
            height={height}
            nodeRelSize={NODE_RADIUS}
            nodeLabel=""
            linkLabel=""
            nodeColor={({ id }) =>
              id === activeId
                ? color.border.focused[scheme]
                : activeId === null || active.nodeIds.has(id)
                  ? color.text.primary[scheme]
                  : color.border.strong[scheme]
            }
            linkColor={({ id }) =>
              active.linkIds.has(id)
                ? color.border.focused[scheme]
                : activeId === null
                  ? color.border.strong[scheme]
                  : color.border.subtle[scheme]
            }
            linkWidth={({ id }) => (active.linkIds.has(id) ? 2 : 1)}
            linkCurvature="curvature"
            nodeCanvasObjectMode={() => 'after'}
            nodeCanvasObject={(node, context, scale) => {
              if (node.x === undefined || node.y === undefined) return;
              if (activeId !== null ? !active.nodeIds.has(node.id) : scale < 1) return;
              const fontSize = 12 / scale;
              context.font = `${fontSize}px ${fontFamily}`;
              context.textAlign = 'center';
              context.textBaseline = 'top';
              context.fillStyle = color.text.primary[scheme];
              context.fillText(node.name, node.x, node.y + NODE_RADIUS + 3 / scale);
            }}
            onNodeHover={(node) => setHoveredId(node?.id ?? null)}
            onNodeClick={({ id }) => setSelectedId(id)}
            onBackgroundClick={() => setSelectedId(null)}
            enableNodeDrag={false}
            maxZoom={5}
            warmupTicks={prefersReducedMotion ? 120 : 0}
            cooldownTicks={prefersReducedMotion ? 0 : 120}
            onEngineStop={handleEngineStop}
          />
        )}
      </div>
      <div aria-live="polite">
        {selectedId === null ? null : (
          <Stack gap="xs">
            <Text fw={fontWeight.medium}>Relationships for {tables.get(selectedId)?.name}</Text>
            {selected.connections.length === 0 ? (
              <Text size="sm" c="dimmed">
                No connected tables.
              </Text>
            ) : (
              <List size="sm">
                {selected.connections.map(({ id, source, target }) => (
                  <List.Item key={id}>
                    {formatEndpoint(source)} to {formatEndpoint(target)}
                  </List.Item>
                ))}
              </List>
            )}
          </Stack>
        )}
      </div>
    </Stack>
  );
}
