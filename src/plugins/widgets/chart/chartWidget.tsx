import { IconChartLine } from '@tabler/icons-react';
import { ChartSkeleton } from '@/ui/components/Skeletons';
import { defineWidget, lazyWidget } from '@/plugins/WidgetPlugin';
import { chartOptions } from './chartOptions';

export const chartWidget = defineWidget({
  type: 'chart',
  name: 'Chart',
  description: 'Values over time, as areas, lines or bars.',
  icon: IconChartLine,
  queryTypes: 'any',
  defaultSize: { w: 6, h: 6 },
  minSize: { w: 2, h: 3 },
  isTimeAware: true,
  optionsSchema: chartOptions,
  component: lazyWidget(() => import('./TimeSeriesEChart').then((m) => ({ default: m.TimeSeriesEChart }))),
  skeleton: <ChartSkeleton />,
});
