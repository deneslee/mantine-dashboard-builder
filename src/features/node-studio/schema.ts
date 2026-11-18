import type { Edge, Node } from '@xyflow/react';

export interface SchemaField {
  id: string;
  name: string;
  type: string;
  isPrimary?: boolean;
}

export type TableNode = Node<{ name: string; fields: SchemaField[] }, 'table'>;

export const TABLES: TableNode[] = [
  {
    id: 'orders',
    type: 'table',
    position: { x: 0, y: 0 },
    data: {
      name: 'Orders',
      fields: [
        { id: 'ord-pk', name: 'id', type: 'int', isPrimary: true },
        { id: 'ord-customer', name: 'customerId', type: 'int' },
        { id: 'ord-billing', name: 'billingCustomerId', type: 'int' },
      ],
    },
  },
  {
    id: 'customers',
    type: 'table',
    position: { x: 360, y: 47 },
    data: {
      name: 'Customers',
      fields: [{ id: 'cust-pk', name: 'id', type: 'int', isPrimary: true }],
    },
  },
];

export const RELATIONSHIPS: Edge[] = [
  {
    id: 'order-customer',
    source: 'orders',
    sourceHandle: 'out:ord-customer',
    target: 'customers',
    targetHandle: 'in:cust-pk',
  },
];
