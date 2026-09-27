import { IconTable } from '@tabler/icons-react';
import { lazy } from 'react';
import { TableSkeleton } from '@/components/feedback/skeletons/Skeletons';
import { defineWidget } from '@/types/widget';
import { tableOptions } from './options';

export const tableWidget = defineWidget({
  type: 'table',
  name: 'Table',
  icon: IconTable,
  defaultSize: { w: 6, h: 6 },
  optionsSchema: tableOptions,
  component: lazy(() => import('./FrameTable').then((m) => ({ default: m.FrameTable }))),
  skeleton: <TableSkeleton rows={5} columns={3} label="Loading table" />,
});
