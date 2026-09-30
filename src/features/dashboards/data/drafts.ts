import { z } from 'zod';
import { AppError } from '@/core/errors/AppError';
import type { Dashboard } from '../state/types';
import { dashboardDoc } from '@/core/dashboard/dashboardSchema';
import { toDashboard, toDocument } from './mapper';

export const savedKey = (id: string) => `dashboard.saved.v1:${id}`;
export const draftKey = (id: string) => `dashboard.draft.v1:${id}`;

export function readSaved(id: string): Dashboard | undefined {
  const raw = localStorage.getItem(savedKey(id));
  if (!raw) return undefined;
  try {
    const dashboard = toDashboard(dashboardDoc.parse(JSON.parse(raw)));
    if (dashboard.id !== id) throw new Error('Dashboard id does not match');
    return dashboard;
  } catch (cause) {
    throw new AppError(
      'validation',
      'The local saved dashboard is invalid. Keep a copy before clearing it.',
      { cause, retryable: false },
    );
  }
}

export function writeSaved(dashboard: Dashboard): void {
  try {
    localStorage.setItem(savedKey(dashboard.id), JSON.stringify(dashboardDoc.parse(toDocument(dashboard))));
  } catch (cause) {
    throw new AppError('unknown', 'Could not save locally. Export JSON to keep your changes.', { cause });
  }
}

const draft = z.object({ baseline: dashboardDoc, document: dashboardDoc });

export function readDraft(id: string): { baseline: Dashboard; document: Dashboard } | undefined {
  const raw = localStorage.getItem(draftKey(id));
  if (!raw) return undefined;
  const parsed = draft.parse(JSON.parse(raw));
  if (parsed.baseline.id !== id || parsed.document.id !== id) throw new Error('Draft id does not match');
  return { baseline: toDashboard(parsed.baseline), document: toDashboard(parsed.document) };
}

export function writeDraft(baseline: Dashboard, document: Dashboard): void {
  localStorage.setItem(
    draftKey(document.id),
    JSON.stringify({ baseline: toDocument(baseline), document: toDocument(document) }),
  );
}

export const clearDraft = (id: string) => localStorage.removeItem(draftKey(id));
