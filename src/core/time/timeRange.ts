import { z } from 'zod';

/** A range as written in the document and the URL: `now`, `now-24h`, `now/d`, or an ISO date. */
export interface TimeRange {
  from: string;
  to: string;
}

/** A range resolved to absolute times, when a query runs. */
export interface ResolvedRange {
  from: Date;
  to: Date;
}

/** A widget's own time: a range of its own, or its parent's range moved back by `by` (`1w`). */
export type TimeOverride = { mode: 'range'; from: string; to: string } | { mode: 'shift'; by: string };

/** What a widget's queries ask for: the range as written, the shifts on top of it, and the zone to resolve it in. */
export interface EffectiveTime {
  range: TimeRange;
  shifts: string[];
  timeZone: string;
}

const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 } as const;
type Unit = keyof typeof unitMs;

/** `now`, `now-<n><unit>`, and either of them rounded with `/<unit>`. */
const relative = /^now(?:-(\d+)([smhdw]))?(?:\/([smhdw]))?$/;
const isoDate = /^\d{4}-\d{2}-\d{2}/;
const duration = /^(\d+)([smhdw])$/;

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formats = new Map<string, Intl.DateTimeFormat>();

/** What a clock in `timeZone` shows at `time` (to the second). */
function wallClock(time: number, timeZone: string): WallClock {
  let format = formats.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    formats.set(timeZone, format);
  }
  const parts = format.formatToParts(time);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    hour: part('hour'),
    minute: part('minute'),
    second: part('second'),
  };
}

const asUtc = (wall: WallClock) =>
  Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);

/** The instant a clock in `timeZone` shows `wall`. Out-of-range fields roll over (day 0 is the last of the month before). */
function fromWallClock(wall: WallClock, timeZone: string): number {
  const guess = asUtc(wall);
  const offset = (time: number) => asUtc(wallClock(time, timeZone)) - Math.floor(time / 1000) * 1000;
  return guess - offset(guess - offset(guess));
}

/** Days and weeks follow the clock in `timeZone`, so a day across a DST change is still midnight to midnight. */
function add(time: number, amount: number, unit: Unit, timeZone: string): number {
  if (unit !== 'd' && unit !== 'w') return time + amount * unitMs[unit];
  const wall = wallClock(time, timeZone);
  return (
    fromWallClock({ ...wall, day: wall.day + amount * (unit === 'w' ? 7 : 1) }, timeZone) + (time % 1000)
  );
}

/** The start of the second, minute, hour, day or week (from Monday) that `time` falls in, in `timeZone`. */
function startOf(time: number, unit: Unit, timeZone: string): number {
  if (unit === 's') return Math.floor(time / 1000) * 1000;
  const wall = { ...wallClock(time, timeZone), second: 0 };
  if (unit === 'm') return fromWallClock(wall, timeZone);
  if (unit === 'h') return fromWallClock({ ...wall, minute: 0 }, timeZone);
  const sinceMonday = (new Date(Date.UTC(wall.year, wall.month - 1, wall.day)).getUTCDay() + 6) % 7;
  const day = unit === 'w' ? wall.day - sinceMonday : wall.day;
  return fromWallClock({ ...wall, day, hour: 0, minute: 0 }, timeZone);
}

/**
 * A time expression as a Date: `now`, `now-<n><unit>` and either rounded with `/<unit>` (units `s m
 * h d w`), or an ISO date. Relative times count back from `now` in `timeZone`; rounding goes to the
 * start of the unit, or to its last millisecond for the `end` of a range (`now/d → now/d` is today).
 * Undefined for anything else.
 */
export function resolveTime(
  value: string,
  now: number,
  timeZone: string,
  edge: 'start' | 'end' = 'start',
): Date | undefined {
  const match = relative.exec(value);
  if (match) {
    const [, amount, unit, round] = match;
    let time = amount && unit ? add(now, -Number(amount), unit as Unit, timeZone) : now;
    if (round) {
      const start = startOf(time, round as Unit, timeZone);
      time = edge === 'start' ? start : add(start, 1, round as Unit, timeZone) - 1;
    }
    return new Date(time);
  }
  if (!isoDate.test(value)) return undefined;
  const time = Date.parse(value);
  return Number.isNaN(time) ? undefined : new Date(time);
}

export const isValidTime = (value: string) => resolveTime(value, 0, 'UTC') !== undefined;

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** The viewer's time zone, from the browser. */
export const localTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Absolute times for a raw range, resolved at `now` in `timeZone`. Undefined when either end is invalid. */
export function resolveRange(
  { from, to }: TimeRange,
  now: number,
  timeZone: string,
): ResolvedRange | undefined {
  const start = resolveTime(from, now, timeZone, 'start');
  const end = resolveTime(to, now, timeZone, 'end');
  return start && end ? { from: start, to: end } : undefined;
}

/** A widget's time resolved at the dashboard's `now`: the range, then each shift moving it back. */
export function resolveEffectiveTime(
  { range, shifts, timeZone }: EffectiveTime,
  now: number,
): ResolvedRange | undefined {
  let resolved = resolveRange(range, now, timeZone);
  for (const by of shifts) {
    const match = duration.exec(by);
    if (!resolved || !match) return undefined;
    const [, amount, unit] = match;
    const back = (date: Date) => new Date(add(date.getTime(), -Number(amount), unit as Unit, timeZone));
    resolved = { from: back(resolved.from), to: back(resolved.to) };
  }
  return resolved;
}

/**
 * A widget's time, highest first: the viewer's override (URL `wt`), the widget's saved override, the
 * dashboard range ([07 §1]; sections come between with stage 4). An own range replaces what is below
 * it and a shift moves it back, so shifts add up.
 */
export function resolveWidgetTime(
  dashboard: TimeRange,
  saved?: TimeOverride,
  viewer?: TimeOverride,
): Omit<EffectiveTime, 'timeZone'> {
  let time = { range: dashboard, shifts: [] as string[] };
  for (const override of [saved, viewer]) {
    if (override?.mode === 'range') time = { range: { from: override.from, to: override.to }, shifts: [] };
    if (override?.mode === 'shift') time = { range: time.range, shifts: [...time.shifts, override.by] };
  }
  return time;
}

export const timeSchema = z
  .string()
  .refine(isValidTime, 'Expected now, now-<n><s|m|h|d|w>, either with /<unit>, or an ISO date.');

export const timeOverrideSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('range'), from: timeSchema, to: timeSchema }),
  z.object({ mode: z.literal('shift'), by: z.string().regex(duration, 'Expected <n><s|m|h|d|w>, e.g. 1w.') }),
]);

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
  { from: 'now/d', label: 'Today' },
] as const;

export const REFRESH_OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: '30s', label: 'Every 30s' },
  { value: '1m', label: 'Every minute' },
  { value: '5m', label: 'Every 5 minutes' },
  { value: '15m', label: 'Every 15 minutes' },
];
