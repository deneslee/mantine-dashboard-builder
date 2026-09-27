import { AppError } from '@/lib/errors/AppError';
import { wait } from '@/utils/wait';
import { dashboardDoc, dashboardListDto } from './dto';
import { toDashboard, toDashboardSummary } from './mapper';
import type { Dashboard, DashboardSummary } from '../model/types';

const BASE = `${import.meta.env.BASE_URL}data/dashboards`;

/** Simulated latency so loading states are visible in development. */
const LATENCY = import.meta.env.DEV ? 600 : 0;

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
  const parsed = dashboardListDto.safeParse(
    await getJson(`${BASE}/index.json`, 'Dashboard list not found.', signal),
  );
  if (!parsed.success)
    throw new AppError('validation', 'Dashboard list has an unexpected format.', {
      details: parsed.error.issues,
    });
  return parsed.data.items.map(toDashboardSummary);
}

export async function getDashboard(id: string, signal?: AbortSignal): Promise<Dashboard> {
  await wait(LATENCY, signal);
  const json = await getJson(
    `${BASE}/${encodeURIComponent(id)}.json`,
    `No dashboard with id "${id}".`,
    signal,
  );
  const parsed = dashboardDoc.safeParse(json);
  if (!parsed.success)
    throw new AppError('validation', 'This dashboard has an unexpected format.', {
      details: parsed.error.issues,
    });
  return toDashboard(parsed.data);
}
