import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { RecordProvider } from '@/core/records/RecordProvider';
import { storageKey } from '../storage';
import {
  configureRecordProviders,
  getActivePlace,
  loadActiveRecordProvider,
  loadRecordProvider,
  onActivePlaceChange,
  setActiveRecordProviderId,
} from './activeRecordProvider';

const fakeProvider = (id: string) => ({ id }) as RecordProvider;
const SETTING = storageKey('record-provider');
const store = (id: string) => localStorage.setItem(SETTING, JSON.stringify({ version: 1, id }));

beforeEach(() => {
  localStorage.clear();
});

describe('the place in use', () => {
  it('loads each provider once and shows a fallback when the stored id is not registered', async () => {
    const loadBrowser = vi.fn(async () => fakeProvider('browser'));
    const loadOther = vi.fn(async () => fakeProvider('other'));
    configureRecordProviders({
      browser: { name: 'This browser', load: loadBrowser },
      other: { name: 'Other', load: loadOther },
    });

    store('convex');
    expect(getActivePlace()).toEqual({ id: 'browser', name: 'This browser', isFallback: true });
    expect((await loadActiveRecordProvider()).id).toBe('browser');

    expect(setActiveRecordProviderId('other')).toEqual({ ok: true });
    expect(getActivePlace()).toEqual({ id: 'other', name: 'Other', isFallback: false });
    expect((await loadActiveRecordProvider()).id).toBe('other');
    await loadRecordProvider('other');

    setActiveRecordProviderId('browser');
    await loadActiveRecordProvider();
    expect(loadBrowser).toHaveBeenCalledTimes(1);
    expect(loadOther).toHaveBeenCalledTimes(1);
  });

  it('says so when the setting cannot be written or names a place that is not there', () => {
    configureRecordProviders({
      browser: { name: 'This browser', load: async () => fakeProvider('browser') },
    });
    expect(setActiveRecordProviderId('convex')).toMatchObject({ ok: false });

    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    expect(setActiveRecordProviderId('browser')).toEqual({ ok: false, message: expect.any(String) });
    setItem.mockRestore();
  });

  it('tells a listener about a change in this tab and in another one, once per change', () => {
    configureRecordProviders({
      browser: { name: 'This browser', load: async () => fakeProvider('browser') },
      other: { name: 'Other', load: async () => fakeProvider('other') },
    });
    const listener = vi.fn();
    const stop = onActivePlaceChange(listener);

    setActiveRecordProviderId('other');
    setActiveRecordProviderId('other');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenLastCalledWith({ id: 'other', name: 'Other', isFallback: false });

    // Another tab writes the setting; this tab only hears the `storage` event.
    store('browser');
    window.dispatchEvent(new StorageEvent('storage', { key: SETTING }));
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith({ id: 'browser', name: 'This browser', isFallback: false });

    stop();
    store('other');
    window.dispatchEvent(new StorageEvent('storage', { key: SETTING }));
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
