import { z } from 'zod';
import { storedDashboardSchema, type Dashboard } from '@/core/dashboard/dashboardSchema';
import { storageKey } from '@/lib/storage';
import { dashboardSourceSchema, type DashboardSource } from './dashboardSource';

/**
 * Unsaved edits per place and dashboard, with the baseline and source they started from, so a reload
 * keeps them and a save still goes where, and against which revision, the editor started.
 */
export const draftKey = (placeId: string, id: string) => storageKey(`draft:${placeId}:${id}`);

/** Before places existed a draft was `draft:<id>`, without a source. It belonged to the browser place. */
const LEGACY_PREFIX = storageKey('draft:');
const legacyDraftKey = (id: string) => `${LEGACY_PREFIX}${id}`;
/** The id of a legacy draft key, or `undefined` for any other key (a current draft has a `:` after the place). */
export const legacyDraftId = (key: string) =>
  key.startsWith(LEGACY_PREFIX) && !key.slice(LEGACY_PREFIX.length).includes(':')
    ? key.slice(LEGACY_PREFIX.length)
    : undefined;

const BROWSER_PLACE = 'browser';

const draft = z.object({
  version: z.literal(2),
  source: dashboardSourceSchema,
  baseline: storedDashboardSchema,
  document: storedDashboardSchema,
});
const legacyDraft = z.object({ baseline: storedDashboardSchema, document: storedDashboardSchema });

export interface Draft {
  source: DashboardSource;
  baseline: Dashboard;
  document: Dashboard;
}

/**
 * The stored draft of a dashboard in a place. It throws when the stored copy is unreadable (the copy is
 * kept), and also for a browser-place draft in the old format that has not been moved yet.
 */
export function readDraft(placeId: string, id: string): Draft | undefined {
  const raw = localStorage.getItem(draftKey(placeId, id));
  if (!raw) {
    if (placeId === BROWSER_PLACE && localStorage.getItem(legacyDraftKey(id)) !== null)
      throw new Error('The draft is stored in an old format and has not been moved yet.');
    return undefined;
  }
  const { version: _version, ...parsed } = draft.parse(JSON.parse(raw));
  if (parsed.baseline.id !== id || parsed.document.id !== id) throw new Error('Draft id does not match');
  if (parsed.source.placeId !== placeId) throw new Error('Draft place does not match');
  return parsed;
}

/** Stored under the source's place, so a draft never moves to another place. */
export function writeDraft(draftValue: Draft): void {
  localStorage.setItem(
    draftKey(draftValue.source.placeId, draftValue.document.id),
    JSON.stringify({ version: 2, ...draftValue }),
  );
}

export const clearDraft = (placeId: string, id: string) => localStorage.removeItem(draftKey(placeId, id));

/** Whether a draft is stored, readable or not; the route opens such a dashboard in edit mode. */
export const hasDraft = (placeId: string, id: string) =>
  localStorage.getItem(draftKey(placeId, id)) !== null ||
  (placeId === BROWSER_PLACE && localStorage.getItem(legacyDraftKey(id)) !== null);

/** How many dashboards in a place have a stored draft. */
export function countDrafts(placeId: string): number {
  const prefix = draftKey(placeId, '');
  let count = 0;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i) ?? '';
      if (key.startsWith(prefix) || (placeId === BROWSER_PLACE && legacyDraftId(key) !== undefined))
        count += 1;
    }
  } catch {
    return count;
  }
  return count;
}

/** A draft in the old format: its baseline and document, or `undefined` when it cannot be read. */
export function readLegacyDraft(id: string): { baseline: Dashboard; document: Dashboard } | undefined {
  const raw = localStorage.getItem(legacyDraftKey(id));
  if (!raw) return undefined;
  try {
    const parsed = legacyDraft.parse(JSON.parse(raw));
    return parsed.baseline.id === id && parsed.document.id === id ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export const hasDraftV2 = (placeId: string, id: string) =>
  localStorage.getItem(draftKey(placeId, id)) !== null;

export const removeLegacyDraft = (id: string) => localStorage.removeItem(legacyDraftKey(id));
