import { lazy } from 'react';
import { z } from 'zod';
import { TextSkeleton } from '@/ui/components/Skeletons';
import { defineWidget } from '@/plugins/WidgetPlugin';

export const kpiWidget = defineWidget({
  type: 'kpi',
  name: 'Key figures',
  defaultSize: { w: 12, h: 3 },
  minSize: { w: 2, h: 2 },
  optionsSchema: z.object({}),
  component: lazy(() => import('./Stats').then((m) => ({ default: m.Stats }))),
  skeleton: <TextSkeleton lines={3} label="Loading key figures" />,
});
