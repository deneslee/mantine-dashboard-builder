/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vite-plus/test';
import type { RecordProvider } from '../src/core/records/RecordProvider';
import { createBrowserStorageProvider } from '../src/plugins/recordProviders/browserStorage/browserStorageProvider';
import {
  createConvexProvider,
  type ConvexRecordClient,
} from '../src/plugins/recordProviders/convex/convexProvider';
import { describeRecordProvider } from '../src/testing/recordProviderSuite';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

/**
 * A client on `convex-test`, which only runs one-shot calls. `onUpdate` is faked: a watched query runs
 * once at registration and again after every mutation, as the real client does when data changes.
 */
function createFakeClient(): ConvexRecordClient {
  const test = convexTest(schema, modules);
  // `convex-test` types calls per function; this client forwards any reference it is given.
  const t = test as unknown as {
    query(ref: unknown, args: unknown): Promise<never>;
    mutation(ref: unknown, args: unknown): Promise<never>;
  };
  const watches = new Set<() => Promise<void>>();
  const starts = new Set<Promise<void>>();
  return {
    query: (query, args) => t.query(query, args),
    async mutation(mutation, args) {
      // Let every watch deliver its first result before the data changes.
      await Promise.all(starts);
      const result = await t.mutation(mutation, args);
      await Promise.all([...watches].map((run) => run()));
      return result;
    },
    onUpdate(query, args, callback) {
      let isWatching = true;
      const run = async () => {
        const result = await t.query(query, args);
        if (isWatching) callback(result);
      };
      watches.add(run);
      const start = run();
      starts.add(start);
      return () => {
        isWatching = false;
        watches.delete(run);
      };
    },
  };
}

const createProvider = () => createConvexProvider({ client: createFakeClient() });

describeRecordProvider('convex', createProvider);

/** A `Storage` that keeps its values in memory. */
function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  } as unknown as Storage;
}

describe('convex provider', () => {
  it('imports an export from browser storage and lists the same records, ids and revisions', async () => {
    const browser: RecordProvider = createBrowserStorageProvider({
      storage: memoryStorage(),
      keyFor: (name) => `test:${name}`,
    });
    await browser.create('patients', { name: 'Anna', age: 70 }, { id: 'p1' });
    await browser.create('patients', { name: 'Bela', age: 60 }, { id: 'p2' });
    await browser.update('patients', 'p2', { age: 61 });
    const exported = await browser.exportCollection('patients');
    if (!exported.ok) throw new Error('export failed');

    const convex = createProvider();
    expect(await convex.importCollection(exported.value)).toEqual({ ok: true, value: { count: 2 } });
    const listed = await convex.list('patients');
    expect(listed).toMatchObject({ ok: true, value: { records: exported.value.records } });
  });

  it('keeps fields whose names Convex would reject as object keys', async () => {
    const provider = createProvider();
    const data = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      _hidden: 1,
      nested: { $ref: 'x' },
    };
    await provider.create('collections', data, { id: 'c1' });
    expect(await provider.get('collections', 'c1')).toEqual({
      ok: true,
      value: { id: 'c1', revision: 1, data },
    });
  });
});
