import { describe, expect, it } from 'vite-plus/test';
import { storageKey } from '@/lib/storage';
import { testDashboard } from '@/testing/fixtures/dashboards';
import type { DashboardSource } from './dashboardSource';
import { clearDraft, countDrafts, draftKey, hasDraft, readDraft, writeDraft } from './drafts';

const record = (placeId: string, revision = 3): DashboardSource => ({ kind: 'record', placeId, revision });
const edited = () => ({ ...testDashboard(), title: 'Edited' });

describe('drafts', () => {
  it('keeps the source with the draft, under the place it came from', () => {
    writeDraft({ source: record('convex'), baseline: testDashboard(), document: edited() });
    expect(localStorage.getItem(draftKey('convex', 'test'))).toContain('"version":2');
    expect(readDraft('convex', 'test')).toEqual({
      source: record('convex'),
      baseline: testDashboard(),
      document: edited(),
    });
    // The same dashboard in another place has no draft.
    expect(hasDraft('browser', 'test')).toBe(false);
    expect(readDraft('browser', 'test')).toBeUndefined();
    expect(countDrafts('convex')).toBe(1);
    expect(countDrafts('browser')).toBe(0);

    clearDraft('convex', 'test');
    expect(hasDraft('convex', 'test')).toBe(false);
  });

  it('refuses a draft whose stored place is not the place it is read for', () => {
    localStorage.setItem(
      draftKey('convex', 'test'),
      JSON.stringify({
        version: 2,
        source: record('browser'),
        baseline: testDashboard(),
        document: edited(),
      }),
    );
    expect(() => readDraft('convex', 'test')).toThrow('place');
  });

  it('shows a draft in the old format to the browser place only, as unreadable until it is moved', () => {
    localStorage.setItem(
      storageKey('draft:test'),
      JSON.stringify({ baseline: testDashboard(), document: edited() }),
    );
    expect(hasDraft('browser', 'test')).toBe(true);
    expect(hasDraft('convex', 'test')).toBe(false);
    expect(countDrafts('browser')).toBe(1);
    expect(() => readDraft('browser', 'test')).toThrow('old format');
    expect(readDraft('convex', 'test')).toBeUndefined();
  });
});
