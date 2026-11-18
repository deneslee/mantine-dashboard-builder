import type { FieldEndpoint, Relationship, Schema } from '../model/schema';

export interface ExploreNode {
  id: string;
  name: string;
}

export interface ExploreLink {
  id: string;
  curvature: number;
}

function copyLinks(relationships: Relationship[]) {
  const groups = new Map<string, Relationship[]>();
  for (const relationship of relationships) {
    const pair = [relationship.source.tableId, relationship.target.tableId].sort();
    const key = JSON.stringify(pair);
    const group = groups.get(key) ?? [];
    group.push(relationship);
    groups.set(key, group);
  }

  return Array.from(groups.values()).flatMap((group) =>
    group.map(({ id, source, target }, index) => {
      const offset = index - (group.length - 1) / 2;
      const direction = source.tableId < target.tableId ? 1 : -1;
      return {
        id,
        source: source.tableId,
        target: target.tableId,
        curvature: source.tableId === target.tableId ? 0.5 + index * 0.2 : offset * direction * 0.3,
      };
    }),
  );
}

export function projectExploreGraph(schema: Schema) {
  const tables = new Map(schema.tables.map((table) => [table.id, table]));
  const relationships = schema.relationships.filter(
    ({ source, target }) => tables.has(source.tableId) && tables.has(target.tableId),
  );
  // The force engine writes coordinates and replaces link endpoints with node objects.
  const graphData = {
    nodes: schema.tables.map(({ id, name }) => ({ id, name })),
    links: copyLinks(relationships),
  };

  function formatEndpoint({ tableId, fieldId }: FieldEndpoint) {
    const table = tables.get(tableId);
    const field = table?.fields.find(({ id }) => id === fieldId);
    return `${table?.name ?? tableId}.${field?.name ?? fieldId}`;
  }

  return { tables, relationships, graphData, formatEndpoint };
}

export function getNeighborhood(relationships: Relationship[], tableId: string | null) {
  const nodeIds = new Set<string>();
  const linkIds = new Set<string>();
  const connections: Relationship[] = [];
  if (tableId === null) return { nodeIds, linkIds, connections };

  nodeIds.add(tableId);
  for (const relationship of relationships) {
    const { source, target } = relationship;
    if (source.tableId === tableId || target.tableId === tableId) {
      connections.push(relationship);
      linkIds.add(relationship.id);
      nodeIds.add(source.tableId);
      nodeIds.add(target.tableId);
    }
  }
  return { nodeIds, linkIds, connections };
}
