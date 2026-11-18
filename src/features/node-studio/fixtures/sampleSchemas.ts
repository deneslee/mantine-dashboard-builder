import type { Relationship, Schema, SchemaTable } from '../model/schema';

function makeRelationship(
  id: string,
  sourceTable: string,
  sourceField: string,
  targetTable: string,
  targetField: string,
): Relationship {
  return {
    id,
    source: { tableId: sourceTable, fieldId: sourceField },
    target: { tableId: targetTable, fieldId: targetField },
  };
}

export const SMALL_SCHEMA: Schema = {
  tables: [
    {
      id: 'orders',
      name: 'Orders',
      fields: [
        { id: 'ord-pk', name: 'id', type: 'int', isPrimary: true },
        { id: 'ord-customer', name: 'customerId', type: 'int' },
        { id: 'ord-billing', name: 'billingCustomerId', type: 'int' },
      ],
    },
    {
      id: 'customers',
      name: 'Customers',
      fields: [{ id: 'cust-pk', name: 'id', type: 'int', isPrimary: true }],
    },
  ],
  relationships: [makeRelationship('order-customer', 'orders', 'ord-customer', 'customers', 'cust-pk')],
};

function makeTable(
  id: string,
  name: string,
  fields: [id: string, name: string, type?: string][],
): SchemaTable {
  return {
    id,
    name,
    fields: [
      { id: `${id}-pk`, name: 'id', type: 'int', isPrimary: true },
      ...fields.map(([fieldId, fieldName, type = 'int']) => ({
        id: fieldId,
        name: fieldName,
        type,
      })),
    ],
  };
}

export const LARGE_SCHEMA: Schema = {
  tables: [
    ...SMALL_SCHEMA.tables,
    makeTable('order-items', 'Order items', [
      ['item-order', 'orderId'],
      ['item-product', 'productId'],
      ['item-quantity', 'quantity'],
    ]),
    makeTable('products', 'Products', [
      ['product-category', 'categoryId'],
      ['product-supplier', 'supplierId'],
      ['product-name', 'name', 'text'],
    ]),
    makeTable('categories', 'Categories', [['category-name', 'name', 'text']]),
    makeTable('suppliers', 'Suppliers', [['supplier-name', 'name', 'text']]),
    makeTable('addresses', 'Addresses', [
      ['address-customer', 'customerId'],
      ['address-city', 'cityId'],
    ]),
    makeTable('cities', 'Cities', [
      ['city-country', 'countryId'],
      ['city-name', 'name', 'text'],
    ]),
    makeTable('countries', 'Countries', [['country-code', 'code', 'text']]),
    makeTable('payments', 'Payments', [
      ['payment-order', 'orderId'],
      ['payment-method', 'paymentMethodId'],
      ['payment-amount', 'amount', 'decimal'],
    ]),
    makeTable('payment-methods', 'Payment methods', [['method-customer', 'customerId']]),
    makeTable('shipments', 'Shipments', [
      ['shipment-order', 'orderId'],
      ['shipment-address', 'addressId'],
      ['shipment-carrier', 'carrierId'],
      ['shipment-warehouse', 'warehouseId'],
    ]),
    makeTable('carriers', 'Carriers', [['carrier-name', 'name', 'text']]),
    makeTable('warehouses', 'Warehouses', [['warehouse-address', 'addressId']]),
    makeTable('inventory', 'Inventory', [
      ['inventory-product', 'productId'],
      ['inventory-warehouse', 'warehouseId'],
      ['inventory-quantity', 'quantity'],
    ]),
    makeTable('returns', 'Returns', [
      ['return-item', 'orderItemId'],
      ['return-payment', 'paymentId'],
    ]),
  ],
  relationships: [
    ...SMALL_SCHEMA.relationships,
    makeRelationship('item-order', 'order-items', 'item-order', 'orders', 'ord-pk'),
    makeRelationship('item-product', 'order-items', 'item-product', 'products', 'products-pk'),
    makeRelationship('product-category', 'products', 'product-category', 'categories', 'categories-pk'),
    makeRelationship('product-supplier', 'products', 'product-supplier', 'suppliers', 'suppliers-pk'),
    makeRelationship('address-customer', 'addresses', 'address-customer', 'customers', 'cust-pk'),
    makeRelationship('address-city', 'addresses', 'address-city', 'cities', 'cities-pk'),
    makeRelationship('city-country', 'cities', 'city-country', 'countries', 'countries-pk'),
    makeRelationship('payment-order', 'payments', 'payment-order', 'orders', 'ord-pk'),
    makeRelationship('payment-method', 'payments', 'payment-method', 'payment-methods', 'payment-methods-pk'),
    makeRelationship('method-customer', 'payment-methods', 'method-customer', 'customers', 'cust-pk'),
    makeRelationship('shipment-order', 'shipments', 'shipment-order', 'orders', 'ord-pk'),
    makeRelationship('shipment-address', 'shipments', 'shipment-address', 'addresses', 'addresses-pk'),
    makeRelationship('shipment-carrier', 'shipments', 'shipment-carrier', 'carriers', 'carriers-pk'),
    makeRelationship('shipment-warehouse', 'shipments', 'shipment-warehouse', 'warehouses', 'warehouses-pk'),
    makeRelationship('warehouse-address', 'warehouses', 'warehouse-address', 'addresses', 'addresses-pk'),
    makeRelationship('inventory-product', 'inventory', 'inventory-product', 'products', 'products-pk'),
    makeRelationship(
      'inventory-warehouse',
      'inventory',
      'inventory-warehouse',
      'warehouses',
      'warehouses-pk',
    ),
    makeRelationship('return-item', 'returns', 'return-item', 'order-items', 'order-items-pk'),
    makeRelationship('return-payment', 'returns', 'return-payment', 'payments', 'payments-pk'),
  ],
};
