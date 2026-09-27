import { IconNumber } from '@tabler/icons-react';
import { lazy } from 'react';
import { z } from 'zod';
import { TextSkeleton } from '@/components/feedback/skeletons/Skeletons';
import { defineWidget } from '@/types/widget';

export const kpiWidget = defineWidget({
  type: 'kpi',
  name: 'Key figures',
  icon: IconNumber,
  defaultSize: { w: 12, h: 3 },
  optionsSchema: z.object({}),
  component: lazy(() => import('./Stats').then((m) => ({ default: m.Stats }))),
  skeleton: <TextSkeleton lines={3} label="Loading key figures" />,
});
