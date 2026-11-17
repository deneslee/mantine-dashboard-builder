import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { AppError, isAppError } from '@/core/errors/AppError';
import type { RecordProvider } from '@/core/records/RecordProvider';
import { configureRecordProviders } from '@/lib/records/activeRecordProvider';
import { notify } from '@/lib/notify/notify';
import { storageKey } from '@/lib/storage';
import { createBrowserStorageProvider } from '@/plugins/recordProviders/browserStorage/browserStorageProvider';
import { testDashboard } from '@/testing/fixtures/dashboards';
import {
  getDashboard,
  listDashboards,
  migrateLegacyDashboards,
  saveDashboard,
  savedKey,
} from './dashboardApi';
import { DASHBOARDS_COLLECTION } from './dashboardSource';
import { draftKey, readDraft } from './drafts';

const browser = { id: 'browser', name: 'This browser' };
const ops = () => ({ ...testDashboard(), id: 'ops', title: 'Operations' });

const index = {
  items: [
    { id: 'sales', title: 'Sales', updatedAt: '2026-09-21T14:12:00Z', widgetCount: 5 },
    { id: 'ops', title: 'Operations', updatedAt: '2026-09-21T14:12:00Z', widgetCount: 2 },
  ],
};

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });

/** The seed files: the index and `ops`; `sales` is listed but its file is missing, as a 404. */
function stubSeeds() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.endsWith('/index.json')) return json(index);
      if (url.endsWith('/ops.json')) return json(ops());
      return new Response('', { status: 404 });
    }),
  );
}

const browserProvider = () => createBrowserStorageProvider({ storage: localStorage, keyFor: storageKey });

function configure(providers: Record<string, RecordProvider> = { browser: browserProvider() }) {
  configureRecordProviders(
    Object.fromEntries(
      Object.entries(providers).map(([id, provider]) => [id, { name: id, load: async () => provider }]),
    ),
  );
}

beforeEach(() => {
  stubSeeds();
  configure();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('saving through a place', () => {
  it('starts from the seed, creates the record on the first save, then updates it by revision', async () => {
    const seeded = await getDashboard('ops', browser);
    expect(seeded.source).toEqual({ kind: 'seed', placeId: 'browser' });

    const first = await saveDashboard({ ...seeded.document, title: 'Ops v1' }, seeded.source);
    expect(first).toEqual({ kind: 'record', placeId: 'browser', revision: 1 });
    const reloaded = await getDashboard('ops', browser);
    expect(reloaded.document.title).toBe('Ops v1');
    expect(reloaded.source).toEqual(first);

    const second = await saveDashboard({ ...reloaded.document, title: 'Ops v2' }, reloaded.source);
    expect(second).toEqual({ kind: 'record', placeId: 'browser', revision: 2 });
    expect((await getDashboard('ops', browser)).document.title).toBe('Ops v2');
  });

  it('replaces the document whole: a field removed before saving does not come back', async () => {
    const seeded = await getDashboard('ops', browser);
    const zoned = await saveDashboard({ ...seeded.document, timeZone: 'Europe/Budapest' }, seeded.source);
    const { timeZone: _removed, ...withoutZone } = (await getDashboard('ops', browser)).document;
    await saveDashboard(withoutZone, zoned);
    expect((await getDashboard('ops', browser)).document.timeZone).toBeUndefined();
  });

  it('refuses a save based on an old revision, and a second create of the same id, as a conflict', async () => {
    const seeded = await getDashboard('ops', browser);
    const first = await saveDashboard(seeded.document, seeded.source);
    await saveDashboard({ ...seeded.document, title: 'Elsewhere' }, first);

    const stale = await saveDashboard({ ...seeded.document, title: 'Mine' }, first).catch((e: unknown) => e);
    expect(isAppError(stale) && stale.code).toBe('conflict');
    const taken = await saveDashboard(seeded.document, seeded.source).catch((e: unknown) => e);
    expect(isAppError(taken) && taken.code).toBe('conflict');
    expect((await getDashboard('ops', browser)).document.title).toBe('Elsewhere');
  });

  it('saves into the place named by the source, not another one that is also registered', async () => {
    const other = createBrowserStorageProvider({
      storage: localStorage,
      keyFor: (name) => `other:${name}`,
      id: 'other',
    });
    configure({ browser: browserProvider(), other });
    const seeded = await getDashboard('ops', { id: 'other', name: 'Other' });
    await saveDashboard(seeded.document, seeded.source);
    expect((await other.get(DASHBOARDS_COLLECTION, 'ops')).ok).toBe(true);
    expect(await browserProvider().get(DASHBOARDS_COLLECTION, 'ops')).toEqual({
      ok: false,
      reason: 'notFound',
    });
  });
});

describe('reading', () => {
  it('falls back to the seed only when the place has no such record, not when it cannot be read', async () => {
    const broken: RecordProvider = {
      ...browserProvider(),
      get: async () => {
        throw new AppError('network', 'No answer.');
      },
      list: async () => {
        throw new AppError('network', 'No answer.');
      },
    };
    configure({ browser: browserProvider(), broken });

    expect((await getDashboard('ops', browser)).source.kind).toBe('seed');
    const error = await getDashboard('ops', { id: 'broken', name: 'Broken' }).catch((e: unknown) => e);
    expect(isAppError(error) && error.code).toBe('network');
    expect(error).toMatchObject({ message: expect.stringContaining("Couldn't read Broken") });
  });

  it('returns the seeds with the reason when the place cannot be listed', async () => {
    const broken: RecordProvider = {
      ...browserProvider(),
      list: async () => {
        throw new AppError('network', 'No answer.');
      },
    };
    configure({ browser: browserProvider(), broken });
    const result = await listDashboards({ id: 'broken', name: 'Broken' });
    expect(result.items.map((item) => item.title)).toEqual(['Sales', 'Operations']);
    expect(result.placeError).toEqual({ placeId: 'broken', placeName: 'Broken', message: 'No answer.' });
  });

  it("overlays the place's records on the seeds and adds records the seeds do not have", async () => {
    const provider = browserProvider();
    await provider.create(DASHBOARDS_COLLECTION, { ...ops(), title: 'Ops renamed' }, { id: 'ops' });
    await provider.create(
      DASHBOARDS_COLLECTION,
      { ...testDashboard(), id: 'mine', title: 'Mine' },
      { id: 'mine' },
    );
    const result = await listDashboards(browser);
    expect(result.placeError).toBeUndefined();
    expect(result.items.map((item) => item.title)).toEqual(['Sales', 'Ops renamed', 'Mine']);
  });

  it('keeps the list working when one saved record is corrupt, and reports it on the dashboard', async () => {
    await browserProvider().create(DASHBOARDS_COLLECTION, { id: 'ops', nonsense: true }, { id: 'ops' });
    const list = await listDashboards(browser);
    expect(list.items.map((item) => item.title)).toEqual(['Sales', 'Operations']);
    const error = await getDashboard('ops', browser).catch((e: unknown) => e);
    expect(isAppError(error) && error.code).toBe('validation');
  });
});

describe('moving the old browser-only saves', () => {
  const legacy = (id: string, value: unknown) => localStorage.setItem(savedKey(id), JSON.stringify(value));

  it('creates a record, removes the old key after, and changes nothing when run again', async () => {
    legacy('ops', { ...ops(), title: 'Old save' });
    expect(await migrateLegacyDashboards()).toBe(1);
    expect(localStorage.getItem(savedKey('ops'))).toBeNull();
    const moved = await browserProvider().get(DASHBOARDS_COLLECTION, 'ops');
    expect(moved).toMatchObject({
      ok: true,
      value: { revision: 1, data: { document: { title: 'Old save' } } },
    });

    expect(await migrateLegacyDashboards()).toBe(0);
    expect(await browserProvider().get(DASHBOARDS_COLLECTION, 'ops')).toEqual(moved);
  });

  it('drops the old key when the record already holds the same dashboard', async () => {
    await browserProvider().create(DASHBOARDS_COLLECTION, ops(), { id: 'ops' });
    legacy('ops', ops());
    expect(await migrateLegacyDashboards()).toBe(0);
    expect(localStorage.getItem(savedKey('ops'))).toBeNull();
  });

  it('keeps the old key and warns when the record differs, or the old copy is not a dashboard', async () => {
    const warn = vi.spyOn(notify, 'warning').mockReturnValue('id');
    await browserProvider().create(DASHBOARDS_COLLECTION, { ...ops(), title: 'Newer' }, { id: 'ops' });
    legacy('ops', { ...ops(), title: 'Old save' });
    localStorage.setItem(savedKey('broken'), '{not json');

    await migrateLegacyDashboards();
    expect(localStorage.getItem(savedKey('ops'))).not.toBeNull();
    expect(localStorage.getItem(savedKey('broken'))).toBe('{not json');
    expect(warn).toHaveBeenCalledTimes(2);
    expect(await browserProvider().get(DASHBOARDS_COLLECTION, 'ops')).toMatchObject({
      value: { revision: 1, data: { title: 'Newer' } },
    });
  });

  it('keeps no old key reachable from other places: they never read it', async () => {
    legacy('ops', { ...ops(), title: 'Old save' });
    const other = createBrowserStorageProvider({
      storage: localStorage,
      keyFor: (n) => `other:${n}`,
      id: 'other',
    });
    configure({ browser: browserProvider(), other });
    // Not moved yet: another place sees the seed, never the browser-only copy.
    const seen = await getDashboard('ops', { id: 'other', name: 'Other' });
    expect(seen.document.title).toBe('Operations');
  });

  it('moves a draft in the old format with the browser record revision, or a conflicting one', async () => {
    const provider = browserProvider();
    await provider.create(DASHBOARDS_COLLECTION, ops(), { id: 'ops' });
    localStorage.setItem(
      storageKey('draft:ops'),
      JSON.stringify({ baseline: ops(), document: { ...ops(), title: 'Edited' } }),
    );
    await migrateLegacyDashboards();
    expect(localStorage.getItem(storageKey('draft:ops'))).toBeNull();
    expect(readDraft('browser', 'ops')).toMatchObject({
      source: { kind: 'record', placeId: 'browser', revision: 1 },
      document: { title: 'Edited' },
    });

    // The record changed since the draft's baseline: its revision cannot be trusted.
    await provider.update(DASHBOARDS_COLLECTION, 'ops', { title: 'Changed since' });
    localStorage.removeItem(draftKey('browser', 'ops'));
    localStorage.setItem(
      storageKey('draft:ops'),
      JSON.stringify({ baseline: ops(), document: { ...ops(), title: 'Edited' } }),
    );
    await migrateLegacyDashboards();
    expect(readDraft('browser', 'ops')?.source).toEqual({ kind: 'record', placeId: 'browser', revision: 0 });
  });
});
