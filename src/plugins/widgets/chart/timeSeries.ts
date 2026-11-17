import { getUnitAffix, type DataFrame, type Field } from '@/core/data/DataFrame';
import { formatTime } from '@/core/time/timeRange';

const DAY = 86_400_000;
export const EMPTY_FRAME: DataFrame = { length: 0, fields: [] };

export interface TimeSeries {
  /** The frame's first time field, if any. */
  time: Field | undefined;
  /** Every number field, one series each. */
  numbers: Field[];
  /** One x-axis label per row, formatted in the dashboard's time zone; empty without a time field. */
  labels: string[];
  /** A value with the first number field's unit around it. */
  formatValue: (value: number) => string;
}

/** Number fields over the frame's time field, with the labels and value format both chart renderers use. */
export function toTimeSeries(frame: DataFrame, timeZone: string): TimeSeries {
  const time = frame.fields.find((field) => field.type === 'time');
  const numbers = frame.fields.filter((field) => field.type === 'number');
  const times = (time?.values ?? []) as number[];
  const span = (times.at(-1) ?? 0) - (times[0] ?? 0);
  const format = span > 2 * DAY ? 'day' : span > DAY ? 'dayTime' : 'time';
  const labels = times.map((t) => formatTime(t, timeZone, format));
  const { prefix = '', suffix = '' } = getUnitAffix(numbers[0]?.config?.unit);
  const formatValue = (value: number) => `${prefix}${value.toLocaleString()}${suffix}`;
  return { time, numbers, labels, formatValue };
}
