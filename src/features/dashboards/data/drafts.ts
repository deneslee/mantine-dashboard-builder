import { z } from 'zod';
import { AppError } from '@/core/errors/AppError';
import {
  dashboardSchema,
  orderWidgets,
  storedDashboardSchema,
  type Dashboard,
} from '@/core/dashboard/dashboardSchema';

export const savedKey = (id: string) => `dashboard.saved.v1:${id}`;
export const draftKey = (id: string) => `dashboard.draft.v1:${id}`;

export function readSaved(id: string): Dashboard | undefined {
  const raw = localStorage.getItem(savedKey(id));
  if (!raw) return undefined;
  try {
    const dashboard = storedDashboardSchema.parse(JSON.parse(raw));
    if (dashboard.id !== id) throw new Error('Dashboard id does not match');
    return dashboard;
  } catch (cause) {
    throw new AppError(
      'validation',
      'The local saved dashboard is invalid. Keep a copy before clearing it.',
      { cause, isRetryable: false },
    );
  }
}

export function writeSaved(dashboard: Dashboard): void {
  try {
    localStorage.setItem(
      savedKey(dashboard.id),
      JSON.stringify(orderWidgets(dashboardSchema.parse(dashboard))),
    );
  } catch (cause) {
    throw new AppError('unknown', 'Could not save locally. Export JSON to keep your changes.', { cause });
  }
}

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
