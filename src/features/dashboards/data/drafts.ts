import { z } from 'zod';
import { storedDashboardSchema, type Dashboard } from '@/core/dashboard/dashboardSchema';
import { storageKey } from '@/lib/storage';

/** Unsaved edits per dashboard, with the baseline they started from, so a reload keeps them. */
export const draftKey = (id: string) => storageKey(`draft:${id}`);

const draft = z.object({ baseline: storedDashboardSchema, document: storedDashboardSchema });

export function readDraft(id: string): { baseline: Dashboard; document: Dashboard } | undefined {
  const raw = localStorage.getItem(draftKey(id));
  if (!raw) return undefined;
  const parsed = draft.parse(JSON.parse(raw));
  if (parsed.baseline.id !== id || parsed.document.id !== id) throw new Error('Draft id does not match');
  return parsed;
}

export function writeDraft(baseline: Dashboard, document: Dashboard): void {
  localStorage.setItem(draftKey(document.id), JSON.stringify({ baseline, document }));
}

export const clearDraft = (id: string) => localStorage.removeItem(draftKey(id));

/** Whether a draft is stored, readable or not; the route opens such a dashboard in edit mode. */
export const hasDraft = (id: string) => localStorage.getItem(draftKey(id)) !== null;
