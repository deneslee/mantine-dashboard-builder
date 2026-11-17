import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  COLLECTION_EXPORT_VERSION,
  type CollectionExport,
  type RecordProvider,
} from '@/core/records/RecordProvider';
import { configureRecordProviders, setActiveRecordProviderId } from '@/lib/records/activeRecordProvider';
import { notify } from '@/lib/notify/notify';
import { act, renderHook } from '@/testing/render';
import type { StorageCollection } from './collections';
import { parseExportFile, useCollectionTransfer } from './useCollectionTransfer';

const things: StorageCollection = {
  id: 'things',
  label: 'Things',
  singular: 'thing',
  validate: (records) =>
    records.filter((record) => record.data.ok !== true).map((record) => `Record "${record.id}" is not ok`),
};

const exportOf = (collection = 'things', count = 2): CollectionExport => ({
  formatVersion: COLLECTION_EXPORT_VERSION,
  collection,
  records: Array.from({ length: count }, (_, i) => ({ id: `t${i + 1}`, revision: 1, data: { ok: true } })),
});

/** A provider that records what was imported; its `importCollection` can be held back. */
function fakePlace(id: string, held?: Promise<void>) {
  const importCollection = vi.fn(async (data: CollectionExport) => {
    await held;
    return { ok: true as const, value: { count: data.records.length } };
  });
  const provider = {
    id,
    exportCollection: async (collection: string) => ({ ok: true as const, value: exportOf(collection, 5) }),
    importCollection,
  } as unknown as RecordProvider;
  return { provider, importCollection };
}

beforeEach(() => {
  vi.spyOn(notify, 'error').mockReturnValue('id');
  vi.spyOn(notify, 'success').mockReturnValue('id');
});
afterEach(() => vi.restoreAllMocks());

describe('a file is checked before anything is replaced', () => {
  it('refuses a file that is not JSON, not an export, for another collection, or with a bad record', () => {
    expect(() => parseExportFile('{nope', things)).toThrow('Nothing was replaced. The file is not JSON.');
    expect(() => parseExportFile('{"a":1}', things)).toThrow('not a collection export');
    expect(() => parseExportFile(JSON.stringify(exportOf('dashboards')), things)).toThrow(
      'The file holds "dashboards", not "things"',
    );
    const bad = exportOf();
    bad.records[0]!.data = { ok: false };
    bad.records[1]!.data = { ok: false };
    expect(() => parseExportFile(JSON.stringify(bad), things)).toThrow(
      'Nothing was replaced. Record "t1" is not ok, and 1 more.',
    );
    const twice = exportOf();
    twice.records[1]!.id = 't1';
    expect(() => parseExportFile(JSON.stringify(twice), things)).toThrow('appears twice');
    expect(parseExportFile(JSON.stringify(exportOf()), things).records).toHaveLength(2);
  });
});

describe('useCollectionTransfer', () => {
  it('leaves the destination as it was for a malformed file and for a file of another collection', async () => {
    const browser = fakePlace('browser');
    configureRecordProviders({
      browser: { name: 'This browser', load: async () => browser.provider },
    });
    const { result } = renderHook(() => useCollectionTransfer());
    const file = (text: string) => new File([text], 'x.json');

    expect(await result.current.prepareImport(file('{nope'), things)).toBeUndefined();
    expect(
      await result.current.prepareImport(file(JSON.stringify(exportOf('other'))), things),
    ).toBeUndefined();
    expect(notify.error).toHaveBeenCalledTimes(2);
    expect(browser.importCollection).not.toHaveBeenCalled();

    const valid = await result.current.prepareImport(file(JSON.stringify(exportOf())), things);
    expect(valid?.records).toHaveLength(2);
    await act(() => result.current.importData('browser', things, valid!));
    expect(browser.importCollection).toHaveBeenCalledOnce();
    expect(notify.success).toHaveBeenCalledWith({ title: 'Imported 2 things' });
  });

  it('copies into the destination fixed at the start, whatever place is in use meanwhile, and shows the wait', async () => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const browser = fakePlace('browser');
    const convex = fakePlace('convex', held);
    configureRecordProviders({
      browser: { name: 'This browser', load: async () => browser.provider },
      convex: { name: 'Convex', load: async () => convex.provider },
    });
    setActiveRecordProviderId('convex');
    const { result } = renderHook(() => useCollectionTransfer({ noticeMs: 0 }));

    let copying!: Promise<void>;
    act(() => {
      copying = result.current.copy('browser', { id: 'convex', name: 'Convex' }, things);
    });
    // The user switches back while the write is out.
    act(() => void setActiveRecordProviderId('browser'));
    await vi.waitFor(() =>
      expect(result.current.active).toMatchObject({ kind: 'copy', placeId: 'convex', isWaiting: true }),
    );

    await act(async () => {
      release();
      await copying;
    });
    expect(convex.importCollection).toHaveBeenCalledOnce();
    expect(convex.importCollection.mock.calls[0]![0].records).toHaveLength(5);
    expect(browser.importCollection).not.toHaveBeenCalled();
    expect(notify.success).toHaveBeenCalledWith({ title: 'Copied 5 things to Convex' });
    expect(result.current.active).toBeNull();
  });

  it('reports a failed copy and that nothing was replaced', async () => {
    const browser = fakePlace('browser');
    const broken = fakePlace('broken');
    broken.importCollection.mockRejectedValue(new Error('Convex said no.'));
    configureRecordProviders({
      browser: { name: 'This browser', load: async () => browser.provider },
      broken: { name: 'Broken', load: async () => broken.provider },
    });
    const { result } = renderHook(() => useCollectionTransfer());
    await act(() => result.current.copy('browser', { id: 'broken', name: 'Broken' }, things));
    expect(notify.error).toHaveBeenCalledWith({
      title: 'Copy failed',
      message: 'Convex said no; nothing was replaced.',
    });
    expect(notify.success).not.toHaveBeenCalled();
  });
});
