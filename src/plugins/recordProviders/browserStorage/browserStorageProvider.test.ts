import { beforeEach, describe, expect, it } from 'vite-plus/test';
import { describeRecordProvider } from '@/testing/recordProviderSuite';
import { createBrowserStorageProvider } from './browserStorageProvider';

const keyFor = (name: string) => `test:${name}`;
const createProvider = () => createBrowserStorageProvider({ storage: localStorage, keyFor });

beforeEach(() => {
  localStorage.clear();
});

describeRecordProvider('browser storage', createProvider);

describe('createBrowserStorageProvider', () => {
  it('keeps each collection under its own key from keyFor, with a version in the value', async () => {
    const provider = createProvider();
    await provider.create('patients', { name: 'Anna' }, { id: 'p1' });
    expect(JSON.parse(localStorage.getItem('test:records:patients')!)).toEqual({
      version: 1,
      records: [{ id: 'p1', revision: 1, data: { name: 'Anna' } }],
    });
  });

  it('shows another provider on the same storage what was written', async () => {
    await createProvider().create('patients', { name: 'Anna' }, { id: 'p1' });
    const read = await createProvider().get('patients', 'p1');
    expect(read).toMatchObject({ ok: true, value: { id: 'p1' } });
  });

  it('rejects stored data it cannot read', async () => {
    localStorage.setItem('test:records:patients', '{not json');
    await expect(createProvider().list('patients')).rejects.toMatchObject({ code: 'validation' });
  });

  it('rejects a write the storage refuses', async () => {
    const full = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
    } as unknown as Storage;
    const provider = createBrowserStorageProvider({ storage: full, keyFor });
    await expect(provider.create('patients', { name: 'Anna' })).rejects.toMatchObject({ code: 'unknown' });
  });

  it('rejects a page size below one, a cursor it did not give, and a foreign export', async () => {
    const provider = createProvider();
    await expect(provider.list('patients', { page: { size: 0 } })).rejects.toMatchObject({
      code: 'validation',
    });
    await expect(provider.list('patients', { page: { size: 2, cursor: 'x' } })).rejects.toMatchObject({
      code: 'validation',
    });
    await expect(
      provider.importCollection({ formatVersion: 2 as 1, collection: 'patients', records: [] }),
    ).rejects.toMatchObject({ code: 'validation' });
  });

  it('matches the contains, ne and range operators', async () => {
    const provider = createProvider();
    await provider.create('patients', { name: 'Anna', tags: ['a', 'b'], age: 70 }, { id: 'p1' });
    await provider.create('patients', { name: 'Bela', tags: ['c'], age: 60 }, { id: 'p2' });
    const ids = async (field: string, operator: 'contains' | 'ne' | 'lt' | 'lte' | 'gt', value: unknown) => {
      const result = await provider.list('patients', { filters: [{ field, operator, value }] });
      return result.ok ? result.value.records.map((r) => r.id) : [];
    };
    expect(await ids('name', 'contains', 'ANN')).toEqual(['p1']);
    expect(await ids('tags', 'contains', 'c')).toEqual(['p2']);
    expect(await ids('name', 'ne', 'Anna')).toEqual(['p2']);
    expect(await ids('age', 'lt', 70)).toEqual(['p2']);
    expect(await ids('age', 'lte', 70)).toEqual(['p1', 'p2']);
    expect(await ids('age', 'gt', 60)).toEqual(['p1']);
    // A value of another type never matches a range.
    expect(await ids('age', 'gt', '60')).toEqual([]);
  });
});
