import { AreaChart, BarChart, LineChart } from '@mantine/charts';
import { getFieldLabel, frameToRows } from '@/core/data/DataFrame';
import type { WidgetProps } from '@/plugins/WidgetPlugin';
import type { ChartOptions } from './chartOptions';
import { EMPTY_FRAME, toTimeSeries } from './timeSeries';

const colors = ['brand.5', 'info.5', 'success.5', 'warning.5'];
/** Dashboards load many charts at once; per-series entry animations are noise and cost. */
const noAnimation = { isAnimationActive: false };
/** The x-axis label, added to each row. */
const X = '__x';

/** Number fields over the frame's time field, as an area, line or bar chart. Fills its tile. */
export function TimeSeriesChart({ frames, options, timeZone }: WidgetProps<ChartOptions>) {
  const frame = frames[0] ?? EMPTY_FRAME;
  const { numbers, labels, formatValue } = toTimeSeries(frame, timeZone);
  const data = frameToRows(frame).map((row, i) => ({ ...row, [X]: labels[i] ?? '' }));

  const series = numbers.map((field, i) => ({
    name: field.name,
    label: getFieldLabel(field),
    color: colors[i % colors.length] ?? 'brand.5',
  }));
  const common = { h: '100%', data, dataKey: X, series, gridAxis: 'y', valueFormatter: formatValue } as const;

  switch (options.form) {
    case 'bar':
      return <BarChart {...common} barProps={noAnimation} />;
    case 'line':
      return <LineChart {...common} curveType="monotone" withDots={false} lineProps={noAnimation} />;
    default:
      return <AreaChart {...common} curveType="monotone" withDots={false} areaProps={noAnimation} />;
  }
}
