import { AreaChart, BarChart, LineChart } from '@mantine/charts';
import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchSeries } from '../../api/demo';
import type { WidgetProps } from '../../model/types';

// Module constants keep chart props stable across renders (docs/grid-and-charts.md, Charts).
const series = [{ name: 'value', label: 'Value', color: 'indigo.5' }];
/** Dashboards load many charts at once; per-series entry animations are noise and cost. */
const noAnimation = { isAnimationActive: false };

/** A day of values as an area, line or bar chart. Fills its tile. */
export function TrendChart({ dashboardId, widget }: WidgetProps) {
  const { data } = useSuspenseQuery({
    queryKey: ['widget', dashboardId, widget.id],
    queryFn: ({ signal }) => fetchSeries(`${dashboardId}:${widget.id}`, signal),
  });

  switch (widget.chart) {
    case 'bar':
      return (
        <BarChart h="100%" data={data} dataKey="time" series={series} gridAxis="y" barProps={noAnimation} />
      );
    case 'line':
      return (
        <LineChart
          h="100%"
          data={data}
          dataKey="time"
          series={series}
          gridAxis="y"
          curveType="monotone"
          withDots={false}
          lineProps={noAnimation}
        />
      );
    default:
      return (
        <AreaChart
          h="100%"
          data={data}
          dataKey="time"
          series={series}
          gridAxis="y"
          curveType="monotone"
          withDots={false}
          areaProps={noAnimation}
        />
      );
  }
}
