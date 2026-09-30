import { IconTable } from '@tabler/icons-react';
import { lazy } from 'react';
import { TableSkeleton } from '@/ui/components/Skeletons';
import { defineWidget } from '@/plugins/WidgetPlugin';
import { tableOptions } from './tableOptions';

export const tableWidget = defineWidget({
  type: 'table',
  name: 'Table',
  icon: IconTable,
  defaultSize: { w: 6, h: 6 },
  minSize: { w: 2, h: 3 },
  capabilities: { time: true, inspect: true, export: ['csv', 'json'], hoverSync: false },
  optionsSchema: tableOptions,
  component: lazy(() => import('./FrameTable').then((m) => ({ default: m.FrameTable }))),
  skeleton: <TableSkeleton rows={5} columns={3} label="Loading table" />,
});
