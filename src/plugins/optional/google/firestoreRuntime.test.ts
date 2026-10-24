import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import type { QueryContext } from '@/plugins/DatasourcePlugin';
import { decodeFirestoreValue, firestoreRuntime, firestoreToFrame } from './firestoreRuntime';

const range = { from: new Date('2026-10-24T00:00:00Z'), to: new Date('2026-10-25T00:00:00Z') };
const ctx = { range } as QueryContext;
const connection = {
  settings: { projectId: 'my-dashboards-123', databaseId: '(default)' },
  secrets: { accessToken: 'ya29.t' },
};

afterEach(() => vi.unstubAllGlobals());

describe('decodeFirestoreValue', () => {
  it('unwraps every value type', () => {
    expect(decodeFirestoreValue({ integerValue: '42' })).toBe(42);
    expect(decodeFirestoreValue({ doubleValue: 0.5 })).toBe(0.5);
    expect(decodeFirestoreValue({ booleanValue: true })).toBe(true);
    expect(decodeFirestoreValue({ nullValue: null })).toBeNull();
    expect(decodeFirestoreValue({ timestampValue: '2026-10-24T09:30:00Z' })).toEqual(
      new Date('2026-10-24T09:30:00Z'),
    );
    expect(
      decodeFirestoreValue({
        mapValue: { fields: { a: { arrayValue: { values: [{ stringValue: 'x' }] } } } },
      }),
    ).toEqual({ a: ['x'] });
  });
});

describe('firestoreToFrame', () => {
  it('puts the document id first, then the fields, typed from their values', () => {
    const frame = firestoreToFrame([
      {
        document: {
          name: 'projects/p/databases/(default)/documents/orders/o1',
          fields: { total: { integerValue: '10' }, at: { timestampValue: '2026-10-24T09:30:00Z' } },
        },
      },
      {
        document: {
          name: 'projects/p/databases/(default)/documents/orders/o2',
          fields: { total: { integerValue: '5' } },
        },
      },
      {},
    ]);
    expect(frame.length).toBe(2);
    expect(frame.fields.map((field) => [field.name, field.type, field.values])).toEqual([
      ['id', 'string', ['o1', 'o2']],
      ['total', 'number', [10, 5]],
      ['at', 'time', [Date.parse('2026-10-24T09:30:00Z'), null]],
    ]);
  });
});

describe('firestoreRuntime', () => {
  it('runs the structured query with its time tokens filled and maxRows as the limit', async () => {
    const fetch = vi.fn(async () => new Response('[]'));
    vi.stubGlobal('fetch', fetch);
    await firestoreRuntime.query(
      connection,
      {
        structuredQuery: {
          from: [{ collectionId: 'orders' }],
          where: {
            fieldFilter: { field: { fieldPath: 'at' }, op: 'GREATER_THAN_OR_EQUAL', value: '$__from' },
          },
        },
        parent: 'users/alice',
        maxRows: 500,
      },
      ctx,
    );
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      'https://firestore.googleapis.com/v1/projects/my-dashboards-123/databases/(default)/documents/users/alice:runQuery',
    );
    expect(JSON.parse(init.body as string)).toEqual({
      structuredQuery: {
        from: [{ collectionId: 'orders' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'at' },
            op: 'GREATER_THAN_OR_EQUAL',
            value: { timestampValue: '2026-10-24T00:00:00.000Z' },
          },
        },
        limit: 500,
      },
    });
  });
});
