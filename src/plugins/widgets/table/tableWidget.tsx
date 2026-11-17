import { IconTable } from '@tabler/icons-react';
import { TableSkeleton } from '@/ui/components/Skeletons';
import { defineWidget, lazyWidget } from '@/plugins/WidgetPlugin';
import { tableOptions } from './tableOptions';

export const tableWidget = defineWidget({
  type: 'table',
  name: 'Table',
  description: 'The rows of each frame, as a table.',
  icon: IconTable,
  queryTypes: 'any',
  defaultSize: { w: 6, h: 6 },
  minSize: { w: 2, h: 3 },
  isTimeAware: true,
  optionsSchema: tableOptions,
  component: lazyWidget(() => import('./FrameTable').then((m) => ({ default: m.FrameTable }))),
  skeleton: <TableSkeleton rows={5} columns={3} label="Loading table" />,
});
