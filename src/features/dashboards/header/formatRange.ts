import { formatTime, RANGE_PRESETS, type TimeRange } from '@/core/time/timeRange';

/**
 * "Last 24 hours" for a preset, otherwise the two ends (`20 Sep 2026 – 27 Sep 2026`, `now-3h – now`),
 * dates as a clock in `timeZone` shows them.
 */
export function formatRange({ from, to }: TimeRange, timeZone: string): string {
  const preset = to === 'now' ? RANGE_PRESETS.find((p) => p.from === from) : undefined;
  if (preset) return preset.label;
  const end = (value: string) =>
    value.startsWith('now') ? value : formatTime(Date.parse(value), timeZone, 'date');
  return `${end(from)} – ${end(to)}`;
}

const UNITS: Record<string, string> = { s: 'second', m: 'minute', h: 'hour', d: 'day', w: 'week' };

/** A shift as words: `1w` is "1 week earlier", `4w` "4 weeks earlier". */
export function formatShift(by: string): string {
  const amount = Number.parseInt(by, 10);
  return `${amount} ${UNITS[by.slice(-1)]}${amount === 1 ? '' : 's'} earlier`;
}
