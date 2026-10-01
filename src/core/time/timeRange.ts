/** A range as written in the document and the URL: `now`, `now-24h`, or an ISO date. */
export interface TimeRange {
  from: string;
  to: string;
}

/** A range resolved to absolute times, when a query runs. */
export interface ResolvedRange {
  from: Date;
  to: Date;
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
export function resolveRange({ from, to }: TimeRange, now = Date.now()): ResolvedRange | undefined {
  const start = resolveTime(from, now);
  const end = resolveTime(to, now);
  return start && end ? { from: start, to: end } : undefined;
}

const interval = /^(\d+)([smh])$/;

/** Auto-refresh interval: `30s`, `1m`, `5m`, … in milliseconds; undefined for `off` or anything else. */
export function parseRefreshInterval(value: string): number | undefined {
  const match = interval.exec(value);
  if (!match) return undefined;
  const [, amount, unit] = match;
  const ms = Number(amount) * unitMs[unit as Unit];
  return ms > 0 ? ms : undefined;
}

export const RANGE_PRESETS = [
  { from: 'now-15m', label: 'Last 15 minutes' },
  { from: 'now-1h', label: 'Last hour' },
  { from: 'now-24h', label: 'Last 24 hours' },
  { from: 'now-7d', label: 'Last 7 days' },
] as const;

export const REFRESH_OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: '30s', label: 'Every 30s' },
  { value: '1m', label: 'Every minute' },
  { value: '5m', label: 'Every 5 minutes' },
  { value: '15m', label: 'Every 15 minutes' },
];
