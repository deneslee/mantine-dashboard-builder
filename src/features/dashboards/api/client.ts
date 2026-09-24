import { AppError } from '@/lib/errors/AppError';
import { dashboardListDto } from './dto';
import { toDashboardSummary } from './mapper';
import type { DashboardSummary } from '../model/types';

const BASE = `${import.meta.env.BASE_URL}data/dashboards`;

/** Simulated latency so loading states are visible in development. */
const LATENCY = import.meta.env.DEV ? 600 : 0;
const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (e) {
    throw new AppError('network', 'Could not load dashboards. Check your connection.', { cause: e });
  }
  if (res.status === 404) throw new AppError('not_found', 'Dashboard list not found.');
  if (!res.ok) throw new AppError('unknown', `Request failed with status ${res.status}.`);
  return res.json();
}

export async function listDashboards(signal?: AbortSignal): Promise<DashboardSummary[]> {
  await wait(LATENCY, signal);
  const parsed = dashboardListDto.safeParse(await getJson(`${BASE}/index.json`, signal));
  if (!parsed.success)
    throw new AppError('validation', 'Dashboard list has an unexpected format.', {
      details: parsed.error.issues,
    });
  return parsed.data.items.map(toDashboardSummary);
}

export async function getDashboard(id: string, signal?: AbortSignal): Promise<DashboardSummary> {
  const all = await listDashboards(signal);
  const found = all.find((d) => d.id === id);
  if (!found) throw new AppError('not_found', `No dashboard with id "${id}".`);
  if (id === 'broken')
    throw new AppError('datasource', 'The data source for this dashboard did not respond in time.');
  return found;
}
