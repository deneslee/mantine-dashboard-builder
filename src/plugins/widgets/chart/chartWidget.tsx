import { IconChartArea } from '@tabler/icons-react';
import { lazy } from 'react';
import { ChartSkeleton } from '@/ui/components/Skeletons';
import { defineWidget } from '@/plugins/WidgetPlugin';
import { chartOptions } from './chartOptions';

export const chartWidget = defineWidget({
  type: 'chart',
  name: 'Chart',
  icon: IconChartArea,
  defaultSize: { w: 6, h: 6 },
  minSize: { w: 2, h: 3 },
  capabilities: { time: true, inspect: true, export: ['csv', 'json'], hoverSync: true },
  optionsSchema: chartOptions,
  component: lazy(() => import('./TimeSeriesChart').then((m) => ({ default: m.TimeSeriesChart }))),
  skeleton: <ChartSkeleton />,
});
