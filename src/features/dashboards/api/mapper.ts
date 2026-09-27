import { byReadingOrder, toLayouts } from '../model/layouts';
import type { Dashboard, DashboardSummary } from '../model/types';
import type { DashboardDocDto, DashboardSummaryDto } from './dto';

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
  const layouts = toLayouts(doc.layouts);
  const order = new Map(layouts.lg.toSorted(byReadingOrder).map((item, n) => [item.i, n]));
  const widgets = Object.entries(doc.widgets)
    .map(([id, w]) => ({
      id,
      type: w.type,
      title: w.title,
      options: w.options,
      queries: w.queries.map((q) => ({ datasource: q.datasource, spec: q.spec })),
    }))
    .toSorted((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return {
    id: doc.id,
    title: doc.title,
    description: doc.description,
    tags: doc.tags,
    updatedAt: new Date(doc.updatedAt),
    timeRange: doc.timeRange,
    refresh: doc.refresh,
    widgets,
    layouts,
  };
}
