import { describe, expect, it } from 'vite-plus/test';
import { getNeighborhood, projectExploreGraph } from './exploreGraph';
import { LARGE_SCHEMA, SMALL_SCHEMA } from '../fixtures/sampleSchemas';

describe('projectExploreGraph', () => {
  it('gives the simulator fresh objects with stable schema IDs', () => {
    const schema = structuredClone(SMALL_SCHEMA);
    const { graphData } = projectExploreGraph(schema);
    const [node] = graphData.nodes;
    const [link] = graphData.links;
    expect(graphData.nodes.map(({ id }) => id)).toEqual(schema.tables.map(({ id }) => id));
    expect(link?.id).toBe(schema.relationships[0]?.id);
    expect(link?.source).toBe(schema.relationships[0]?.source.tableId);
    expect(link?.target).toBe(schema.relationships[0]?.target.tableId);

    Object.assign(node!, { x: 25, y: 50 });
    Object.assign(link!, { source: node });
    expect(schema).toEqual(SMALL_SCHEMA);
    expect(projectExploreGraph(schema).graphData).toEqual(projectExploreGraph(SMALL_SCHEMA).graphData);
  });

  it('renders parallel relationships as distinct curves and preserves both field endpoints', () => {
    const [original] = SMALL_SCHEMA.relationships;
    const parallel = {
      ...original!,
      id: 'billing-link',
      source: { ...original!.source, fieldId: 'ord-billing' },
    };
    const { graphData, relationships, formatEndpoint } = projectExploreGraph({
      ...SMALL_SCHEMA,
      relationships: [...SMALL_SCHEMA.relationships, parallel],
    });

    expect(graphData.links.map(({ id }) => id)).toEqual([original!.id, parallel.id]);
    expect(new Set(graphData.links.map(({ curvature }) => curvature)).size).toBe(2);
    expect(getNeighborhood(relationships, parallel.source.tableId).connections).toEqual([original, parallel]);
    expect(formatEndpoint(original!.source)).toBe('Orders.customerId');
    expect(formatEndpoint(original!.target)).toBe('Customers.id');
    expect(formatEndpoint(parallel.source)).toBe('Orders.billingCustomerId');
  });
});

describe('getNeighborhood', () => {
  it('includes incoming and outgoing links and excludes indirect neighbors', () => {
    const { relationships } = projectExploreGraph(LARGE_SCHEMA);
    const { nodeIds, linkIds } = getNeighborhood(relationships, 'orders');

    expect(nodeIds).toEqual(new Set(['orders', 'customers', 'order-items', 'payments', 'shipments']));
    expect(linkIds).toEqual(
      new Set([SMALL_SCHEMA.relationships[0]?.id, 'item-order', 'payment-order', 'shipment-order']),
    );
  });
});
