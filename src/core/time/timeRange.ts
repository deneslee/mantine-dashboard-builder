import { z } from 'zod';
import type { TimeRange } from '@/plugins/DatasourcePlugin';

/** A range as written in the document and the URL: `now`, `now-24h`, or an ISO date. */
export interface RawRange {
  from: string;
  to: string;
}

const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 } as const;
type Unit = keyof typeof unitMs;

const relative = /^now(?:-(\d+)([smhdw]))?$/;
const isoDate = /^\d{4}-\d{2}-\d{2}/;

/** `now`, `now-<n><s|m|h|d|w>` or an ISO date, as a Date; undefined for anything else. */
export function resolveTime(value: string, now = Date.now()): Date | undefined {
  const match = relative.exec(value);
  if (match) {
    const [, amount, unit] = match;
    return new Date(now - (amount && unit ? Number(amount) * unitMs[unit as Unit] : 0));
  }
  if (!isoDate.test(value)) return undefined;
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : new Date(time);
}

export const isValidTime = (value: string) => resolveTime(value) !== undefined;

/** Absolute times for a raw range, resolved at `now`. Undefined when either end is invalid. */
export function resolveRange({ from, to }: RawRange, now = Date.now()): TimeRange | undefined {
  const start = resolveTime(from, now);
  const end = resolveTime(to, now);
  return start && end ? { from: start, to: end } : undefined;
}

const interval = /^(\d+)([smh])$/;

/** Auto-refresh interval: `30s`, `1m`, `5m`, … in milliseconds; undefined for `off` or anything else. */
export function refreshMs(value: string): number | undefined {
  const match = interval.exec(value);
  if (!match) return undefined;
  const [, amount, unit] = match;
  const ms = Number(amount) * unitMs[unit as Unit];
  return ms > 0 ? ms : undefined;
}

export const rangePresets = [
  { from: 'now-15m', label: 'Last 15 minutes' },
  { from: 'now-1h', label: 'Last hour' },
  { from: 'now-24h', label: 'Last 24 hours' },
  { from: 'now-7d', label: 'Last 7 days' },
] as const;

export const refreshOptions = [
  { value: 'off', label: 'Off' },
  { value: '30s', label: 'Every 30s' },
  { value: '1m', label: 'Every minute' },
  { value: '5m', label: 'Every 5 minutes' },
  { value: '15m', label: 'Every 15 minutes' },
];

/**
 * A dashboard route's search params: `?from=now-24h&to=now&refresh=1m`. Invalid values are
 * dropped, so the document's defaults apply instead.
 */
export const dashboardSearch = z.object({
  mode: z.enum(['view', 'edit']).default('view').catch('view'),
  widget: z.string().min(1).optional().catch(undefined),
  editor: z.literal('queries').optional().catch(undefined),
  from: z.string().refine(isValidTime).optional().catch(undefined),
  to: z.string().refine(isValidTime).optional().catch(undefined),
  refresh: z
    .string()
    .refine((value) => value === 'off' || refreshMs(value) !== undefined)
    .optional()
    .catch(undefined),
});

export type DashboardSearch = Partial<z.output<typeof dashboardSearch>>;
