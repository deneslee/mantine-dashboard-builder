import { IconNumbers } from '@tabler/icons-react';
import { z } from 'zod';
import { TextSkeleton } from '@/ui/components/Skeletons';
import { defineWidget, lazyWidget } from '@/plugins/WidgetPlugin';

export const kpiWidget = defineWidget({
  type: 'kpi',
  name: 'Key figures',
  description: 'The latest value of each number field, as large figures.',
  icon: IconNumbers,
  queryTypes: 'any',
  defaultSize: { w: 12, h: 3 },
  minSize: { w: 2, h: 2 },
  isTimeAware: true,
  optionsSchema: z.object({}),
  component: lazyWidget(() => import('./Stats').then((m) => ({ default: m.Stats }))),
  skeleton: <TextSkeleton lines={3} label="Loading key figures" />,
});
