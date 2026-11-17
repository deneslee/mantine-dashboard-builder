import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { RecordProvider } from '@/core/records/RecordProvider';
import {
  configureRecordProviders,
  loadActiveRecordProvider,
  setActiveRecordProviderId,
} from './activeRecordProvider';

const fakeProvider = (id: string) => ({ id }) as RecordProvider;

beforeEach(() => {
  localStorage.clear();
});

describe('loadActiveRecordProvider', () => {
  it('loads each provider once and falls back to browser for an id that is not registered', async () => {
    const loadBrowser = vi.fn(async () => fakeProvider('browser'));
    const loadOther = vi.fn(async () => fakeProvider('other'));
    configureRecordProviders({ browser: { load: loadBrowser }, other: { load: loadOther } });

    setActiveRecordProviderId('convex');
    expect((await loadActiveRecordProvider()).id).toBe('browser');

    setActiveRecordProviderId('other');
    expect((await loadActiveRecordProvider()).id).toBe('other');
    await loadActiveRecordProvider();

    setActiveRecordProviderId('browser');
    await loadActiveRecordProvider();
    expect(loadBrowser).toHaveBeenCalledTimes(1);
    expect(loadOther).toHaveBeenCalledTimes(1);
  });
});
