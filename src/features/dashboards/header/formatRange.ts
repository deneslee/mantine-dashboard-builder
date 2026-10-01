import dayjs from 'dayjs';
import { RANGE_PRESETS, type TimeRange } from '@/core/time/timeRange';

/**
 * "Last 24 hours" for a preset, otherwise the two ends (`20 Sep 2026 – 27 Sep 2026`, `now-3h – now`).
 * Apart from `model/timeRange.ts`, which the route's search validation loads up front: dayjs stays
 * in the dashboard chunk.
 */
export function formatRange({ from, to }: TimeRange): string {
  const preset = to === 'now' ? RANGE_PRESETS.find((p) => p.from === from) : undefined;
  if (preset) return preset.label;
  const end = (value: string) => (value.startsWith('now') ? value : dayjs(value).format('D MMM YYYY'));
  return `${end(from)} – ${end(to)}`;
}
