/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import type { RecordProvider } from '../src/core/records/RecordProvider';
import { createBrowserStorageProvider } from '../src/plugins/recordProviders/browserStorage/browserStorageProvider';
import {
  createConvexProvider,
  READ_TIMEOUT_MS,
  STATUS_BUDGET_MS,
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
    connectionState: () => ({ isWebSocketConnected: true }),
    subscribeToConnectionState: () => () => {},
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

/** A client whose calls never answer and which never connects. */
const silentClient = (overrides: Partial<ConvexRecordClient> = {}): ConvexRecordClient => ({
  query: () => new Promise<never>(() => {}),
  mutation: () => new Promise<never>(() => {}),
  onUpdate: () => () => {},
  connectionState: () => ({ isWebSocketConnected: false }),
  subscribeToConnectionState: () => () => {},
  ...overrides,
});

describe('convex provider status and timing', () => {
  afterEach(() => vi.useRealTimers());

  it('is notDeployed when the server has no record functions', async () => {
    const provider = createConvexProvider({
      client: {
        ...createFakeClient(),
        query: async () => {
          throw new Error(
            "Could not find public function for 'records:listCollection'. Did you forget to run `npx convex dev` or `npx convex deploy`?",
          );
        },
      },
      url: 'https://x.convex.cloud',
    });
    expect(await provider.checkStatus()).toMatchObject({
      state: 'notDeployed',
      message: expect.stringContaining('npx convex dev'),
    });
  });

  it('is failed for any other error', async () => {
    const provider = createConvexProvider({
      client: {
        ...createFakeClient(),
        query: async () => {
          throw new Error('Server Error');
        },
      },
    });
    expect(await provider.checkStatus()).toEqual({ state: 'failed', message: 'Server Error' });
  });

  it('is unreachable when nothing answers within the one 10 s budget', async () => {
    vi.useFakeTimers();
    const provider = createConvexProvider({ client: silentClient(), url: 'https://x.convex.cloud' });
    const status = provider.checkStatus();
    await vi.advanceTimersByTimeAsync(STATUS_BUDGET_MS);
    expect(await status).toMatchObject({
      state: 'unreachable',
      message: expect.stringContaining('x.convex.cloud'),
    });
  });

  it('gives up a read after ten seconds', async () => {
    vi.useFakeTimers();
    const provider = createConvexProvider({ client: silentClient() });
    const listed = provider.list('patients');
    const outcome = expect(listed).rejects.toMatchObject({ code: 'network' });
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
    await outcome;
  });

  it('never times a write out: one that answers after ten seconds still succeeds', async () => {
    vi.useFakeTimers();
    const fake = createFakeClient();
    const provider = createConvexProvider({
      client: {
        ...fake,
        mutation: (mutation, args) =>
          new Promise((resolve, reject) => {
            setTimeout(() => fake.mutation(mutation, args).then(resolve, reject), READ_TIMEOUT_MS + 5000);
          }),
      },
    });
    const created = provider.create('patients', { name: 'Anna' }, { id: 'p1' });
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS + 6000);
    expect(await created).toMatchObject({ ok: true, value: { id: 'p1', revision: 1 } });
  });
});

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
