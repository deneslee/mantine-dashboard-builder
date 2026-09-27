import dayjs from 'dayjs';
import { rangePresets, type RawRange } from '../../model/timeRange';

/**
 * "Last 24 hours" for a preset, otherwise the two ends (`20 Sep 2026 – 27 Sep 2026`, `now-3h – now`).
 * Apart from `model/timeRange.ts`, which the route's search validation loads up front: dayjs stays
 * in the dashboard chunk.
 */
export function rangeLabel({ from, to }: RawRange): string {
  const preset = to === 'now' ? rangePresets.find((p) => p.from === from) : undefined;
  if (preset) return preset.label;
  const end = (value: string) => (value.startsWith('now') ? value : dayjs(value).format('D MMM YYYY'));
  return `${end(from)} – ${end(to)}`;
}
