import { byReadingOrder } from '@/core/dashboard/layout';
import type { Dashboard, DashboardSummary } from '../state/types';
import type { DashboardDocDto, DashboardSummaryDto } from '@/core/dashboard/dashboardSchema';

export function toDashboardSummary(dto: DashboardSummaryDto): DashboardSummary {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    updatedAt: new Date(dto.updated_at),
    widgetCount: dto.widget_count,
    tags: dto.tags,
  };
}

export function toDashboard(doc: DashboardDocDto): Dashboard {
  return {
    version: doc.version,
    id: doc.id,
    title: doc.title,
    description: doc.description,
    tags: doc.tags,
    updatedAt: doc.updatedAt,
    timeRange: doc.timeRange,
    refresh: doc.refresh,
    variables: doc.variables,
    widgets: Object.fromEntries(Object.entries(doc.widgets).map(([id, widget]) => [id, { id, ...widget }])),
    layouts: doc.layouts,
  };
}

/** The stored shape, ordered by lg; grid metadata never leaves the canvas. */
export function toDocument(dashboard: Dashboard): DashboardDocDto {
  const widgets = Object.fromEntries(
    dashboard.layouts.lg.toSorted(byReadingOrder).map(({ i }) => {
      const { id: _id, ...widget } = dashboard.widgets[i]!;
      return [i, widget];
    }),
  );
  return { ...dashboard, widgets } as DashboardDocDto;
}
