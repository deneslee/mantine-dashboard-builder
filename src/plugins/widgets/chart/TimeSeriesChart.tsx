import { AreaChart, BarChart, LineChart } from '@mantine/charts';
import { getFieldLabel, frameToRows, getUnitAffix, type DataFrame } from '@/core/data/DataFrame';
import { formatTime } from '@/core/time/timeRange';
import type { WidgetProps } from '@/plugins/WidgetPlugin';
import type { ChartOptions } from './chartOptions';

const colors = ['brand.5', 'info.5', 'success.5', 'warning.5'];
/** Dashboards load many charts at once; per-series entry animations are noise and cost. */
const noAnimation = { isAnimationActive: false };
const DAY = 86_400_000;
/** The x-axis label, added to each row. */
const X = '__x';
const empty: DataFrame = { length: 0, fields: [] };

/** Number fields over the frame's time field, as an area, line or bar chart. Fills its tile. */
export function TimeSeriesChart({ frames, options, timeZone }: WidgetProps<ChartOptions>) {
  const frame = frames[0] ?? empty;
  const time = frame.fields.find((field) => field.type === 'time');
  const numbers = frame.fields.filter((field) => field.type === 'number');

  const times = (time?.values ?? []) as number[];
  const span = (times.at(-1) ?? 0) - (times[0] ?? 0);
  const format = span > 2 * DAY ? 'day' : span > DAY ? 'dayTime' : 'time';
  const data = frameToRows(frame).map((row) => ({
    ...row,
    [X]: time ? formatTime(row[time.name] as number, timeZone, format) : '',
  }));

  const series = numbers.map((field, i) => ({
    name: field.name,
    label: getFieldLabel(field),
    color: colors[i % colors.length] ?? 'brand.5',
  }));
  const { prefix = '', suffix = '' } = getUnitAffix(numbers[0]?.config?.unit);
  const valueFormatter = (value: number) => `${prefix}${value.toLocaleString()}${suffix}`;
  const common = { h: '100%', data, dataKey: X, series, gridAxis: 'y', valueFormatter } as const;

  switch (options.form) {
    case 'bar':
      return <BarChart {...common} barProps={noAnimation} />;
    case 'line':
      return <LineChart {...common} curveType="monotone" withDots={false} lineProps={noAnimation} />;
    default:
      return <AreaChart {...common} curveType="monotone" withDots={false} areaProps={noAnimation} />;
  }
}
