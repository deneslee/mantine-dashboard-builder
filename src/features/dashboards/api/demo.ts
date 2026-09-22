import { AppError } from '@/shared/errors';

/**
 * Stand-in widget data until datasources exist (phase 2). Deterministic per dashboard so
 * refreshes look stable; latency is random so skeletons are visible.
 */
export interface Kpi {
  label: string;
  value: number;
  unit?: string;
  delta: number;
}

function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

export async function fetchKpis(dashboardId: string, signal?: AbortSignal): Promise<Kpi[]> {
  const rand = seeded(dashboardId);
  await sleep(500 + Math.random() * 900, signal);
  return [
    { label: 'Revenue', value: Math.round(80_000 + rand() * 120_000), unit: '€', delta: rand() * 0.3 - 0.1 },
    { label: 'Active sites', value: Math.round(20 + rand() * 60), delta: rand() * 0.2 - 0.05 },
    { label: 'Open alarms', value: Math.round(rand() * 40), delta: rand() * 0.4 - 0.2 },
  ];
}

export interface RegionRow {
  region: string;
  value: number;
  share: number;
}

export async function fetchRegions(dashboardId: string, signal?: AbortSignal): Promise<RegionRow[]> {
  const rand = seeded(`${dashboardId}:regions`);
  await sleep(700 + Math.random() * 1200, signal);
  const regions = ['Central Europe', 'Nordics', 'Iberia', 'UK & Ireland', 'Benelux'];
  const values = regions.map(() => Math.round(5_000 + rand() * 40_000));
  const total = values.reduce((a, b) => a + b, 0);
  return regions.map((region, i) => ({ region, value: values[i] ?? 0, share: (values[i] ?? 0) / total }));
}

/** Always fails, to demonstrate the per-widget error boundary. */
export async function fetchBroken(signal?: AbortSignal): Promise<never> {
  await sleep(800, signal);
  throw new AppError('datasource', 'Haystack server returned 502 for query "equip and hvac".');
}
