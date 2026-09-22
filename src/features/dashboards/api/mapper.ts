import type { DashboardSummary } from '../model/types';
import type { DashboardSummaryDto } from './dto';

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
