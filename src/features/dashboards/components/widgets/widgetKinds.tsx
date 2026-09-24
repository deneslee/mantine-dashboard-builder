import { lazy, type ComponentType, type ReactNode } from 'react';
import { ChartSkeleton, TableSkeleton, TextSkeleton } from '@/components/feedback';
import type { WidgetKind, WidgetProps } from '../../model/types';

interface WidgetKindDef {
  /** A lazy chunk per kind: a dashboard only loads the widget code it shows. */
  component: ComponentType<WidgetProps>;
  /** Shown while the tile waits to come into view and while its chunk and data load. */
  skeleton: ReactNode;
}

/** Widget kinds the demo dashboards use. Becomes the widget registry in phase 2. */
export const widgetKinds: Record<WidgetKind, WidgetKindDef> = {
  kpis: {
    component: lazy(() => import('./Kpis').then((m) => ({ default: m.Kpis }))),
    skeleton: <TextSkeleton lines={3} label="Loading key figures" />,
  },
  regions: {
    component: lazy(() => import('./Regions').then((m) => ({ default: m.Regions }))),
    skeleton: <TableSkeleton rows={5} columns={3} label="Loading regions" />,
  },
  broken: {
    component: lazy(() => import('./Broken').then((m) => ({ default: m.Broken }))),
    skeleton: <TextSkeleton lines={4} label="Loading alarms" />,
  },
  trend: {
    component: lazy(() => import('./TrendChart').then((m) => ({ default: m.TrendChart }))),
    skeleton: <ChartSkeleton />,
  },
};
