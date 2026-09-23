import { AppError } from '@/shared/errors';
import type { ChartForm, DashboardWidget } from '../model/types';

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

export interface SeriesPoint {
  time: string;
  value: number;
}

/** A day of half-hourly values: a seeded random walk, so each widget keeps its own shape. */
export async function fetchSeries(seed: string, signal?: AbortSignal): Promise<SeriesPoint[]> {
  const rand = seeded(seed);
  await sleep(300 + Math.random() * 700, signal);
  let value = 40 + rand() * 40;
  return Array.from({ length: 48 }, (_, i) => {
    value = Math.max(0, value + (rand() - 0.48) * 12);
    const hh = String(Math.floor(i / 2)).padStart(2, '0');
    return { time: `${hh}:${i % 2 ? '30' : '00'}`, value: Math.round(value) };
  });
}

const forms: ChartForm[] = ['area', 'line', 'bar'];

/** The "Grid performance" dashboard: 20 charts, three per row on a wide canvas. */
function perfWidgets(): DashboardWidget[] {
  return Array.from({ length: 20 }, (_, i) => ({
    id: `chart-${i + 1}`,
    kind: 'trend',
    title: `Series ${i + 1}`,
    chart: forms[i % forms.length],
    placement: { x: (i % 3) * 4, y: Math.floor(i / 3) * 6, w: 4, h: 6 },
  }));
}

/** Tiles each dashboard shows until dashboards carry their own widgets (phase 2). */
export function demoWidgets(dashboardId: string): DashboardWidget[] {
  if (dashboardId === 'perf') return perfWidgets();
  return [
    { id: 'kpis', kind: 'kpis', title: 'Key figures', placement: { x: 0, y: 0, w: 12, h: 3 } },
    {
      id: 'revenue',
      kind: 'trend',
      chart: 'area',
      title: 'Revenue, last 24 hours',
      placement: { x: 0, y: 3, w: 8, h: 6 },
    },
    { id: 'regions', kind: 'regions', title: 'Revenue by region', placement: { x: 8, y: 3, w: 4, h: 6 } },
    { id: 'alarms', kind: 'broken', title: 'HVAC alarms', placement: { x: 0, y: 9, w: 6, h: 6 } },
    {
      id: 'occupancy',
      kind: 'trend',
      chart: 'line',
      title: 'Occupancy',
      placement: { x: 6, y: 9, w: 6, h: 6 },
    },
  ];
}

/** Always fails, to demonstrate the per-widget error boundary. */
export async function fetchBroken(signal?: AbortSignal): Promise<never> {
  await sleep(800, signal);
  throw new AppError('datasource', 'Haystack server returned 502 for query "equip and hvac".');
}
