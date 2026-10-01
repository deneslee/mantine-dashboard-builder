import { AppError } from '@/core/errors/AppError';
import { wait } from '@/utils/wait';
import {
  dashboardListSchema,
  dashboardSchema,
  orderWidgets,
  storedDashboardSchema,
  type Dashboard,
  type DashboardSummary,
} from '@/core/dashboard/dashboardSchema';

/**
 * The dashboards "backend". The files in `public/data/dashboards/` are the seed; a save is a
 * browser-local copy that overrides its file. An HTTP API replaces this file and nothing else.
 */
const BASE = `${import.meta.env.BASE_URL}data/dashboards`;

/** Simulated latency so loading states are visible in development. */
const LATENCY = import.meta.env.DEV ? 600 : 0;

export const savedKey = (id: string) => `dashboard.saved.v1:${id}`;

function readSaved(id: string): Dashboard | undefined {
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

async function getJson(url: string, notFound: string, signal?: AbortSignal): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new AppError('network', 'Could not load dashboards. Check your connection.', { cause: e });
  }
  // The dev server answers unknown paths with index.html, so anything that isn't JSON is missing too.
  if (res.status === 404 || !res.headers.get('content-type')?.includes('json'))
    throw new AppError('not_found', notFound);
  if (!res.ok) throw new AppError('unknown', `Request failed with status ${res.status}.`);
  return res.json();
}

export async function listDashboards(signal?: AbortSignal): Promise<DashboardSummary[]> {
  await wait(LATENCY, signal);
  const parsed = dashboardListSchema.safeParse(
    await getJson(`${BASE}/index.json`, 'Dashboard list not found.', signal),
  );
  if (!parsed.success)
    throw new AppError('validation', 'Dashboard list has an unexpected format.', {
      details: parsed.error.issues,
    });
  return parsed.data.items.map((item) => {
    let saved: Dashboard | undefined;
    try {
      saved = readSaved(item.id);
    } catch {
      // The list shows the file's summary; opening the dashboard reports the broken saved copy.
    }
    return saved
      ? {
          id: saved.id,
          title: saved.title,
          description: saved.description,
          tags: saved.tags,
          updatedAt: saved.updatedAt,
          widgetCount: Object.keys(saved.widgets).length,
        }
      : item;
  });
}

export async function getDashboard(id: string, signal?: AbortSignal): Promise<Dashboard> {
  const saved = readSaved(id);
  if (saved) return saved;
  await wait(LATENCY, signal);
  const json = await getJson(
    `${BASE}/${encodeURIComponent(id)}.json`,
    `No dashboard with id "${id}".`,
    signal,
  );
  const parsed = storedDashboardSchema.safeParse(json);
  if (!parsed.success)
    throw new AppError('validation', 'This dashboard has an unexpected format.', {
      details: parsed.error.issues,
    });
  return parsed.data;
}

export async function saveDashboard(dashboard: Dashboard): Promise<void> {
  try {
    localStorage.setItem(
      savedKey(dashboard.id),
      JSON.stringify(orderWidgets(dashboardSchema.parse(dashboard))),
    );
  } catch (cause) {
    throw new AppError('unknown', 'Could not save locally. Export JSON to keep your changes.', { cause });
  }
}
