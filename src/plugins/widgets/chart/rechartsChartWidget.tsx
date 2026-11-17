import { IconChartArea } from '@tabler/icons-react';
import { ChartSkeleton } from '@/ui/components/Skeletons';
import { defineWidget, lazyWidget } from '@/plugins/WidgetPlugin';
import { chartOptions } from './chartOptions';

export const rechartsChartWidget = defineWidget({
  type: 'chart-recharts',
  name: 'Chart (Recharts)',
  description: 'Values over time, as areas, lines or bars, drawn with Recharts.',
  icon: IconChartArea,
  queryTypes: 'any',
  defaultSize: { w: 6, h: 6 },
  minSize: { w: 2, h: 3 },
  isTimeAware: true,
  optionsSchema: chartOptions,
  component: lazyWidget(() => import('./TimeSeriesChart').then((m) => ({ default: m.TimeSeriesChart }))),
  skeleton: <ChartSkeleton />,
});
