import { IconChartArea } from '@tabler/icons-react';
import { lazy } from 'react';
import { ChartSkeleton } from '@/components/feedback/skeletons/Skeletons';
import { defineWidget } from '@/types/widget';
import { chartOptions } from './options';

export const chartWidget = defineWidget({
  type: 'chart',
  name: 'Chart',
  icon: IconChartArea,
  defaultSize: { w: 6, h: 6 },
  optionsSchema: chartOptions,
  component: lazy(() => import('./TimeSeriesChart').then((m) => ({ default: m.TimeSeriesChart }))),
  skeleton: <ChartSkeleton />,
});
