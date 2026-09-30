import type { Query } from '@/plugins/DatasourcePlugin';
import type { AuthoredLayouts } from '@/core/dashboard/layout';
import type { RawRange } from '@/core/time/timeRange';

/** A tile: which widget draws it, the widget's options (the widget checks them) and its queries. */
export interface Widget {
  id: string;
  type: string;
  title: string;
  options: unknown;
  description?: string;
  queries: Query[];
}

/** A dashboard as the UI uses it. Never the wire shape. */
export interface Dashboard {
  version: 1;
  id: string;
  title: string;
  description: string;
  tags: string[];
  updatedAt: string;
  /** Defaults; the URL overrides them. */
  timeRange: RawRange;
  refresh: string;
  variables: unknown[];
  widgets: Record<string, Widget>;
  /** Only authored layouts are saved; missing breakpoints are projected by the canvas. */
  layouts: AuthoredLayouts;
}

/** An entry in the dashboard list. */
export interface DashboardSummary {
  id: string;
  title: string;
  description: string;
  updatedAt: Date;
  widgetCount: number;
  tags: string[];
}
