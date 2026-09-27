import type { Query } from '@/types/datasource';
import type { Breakpoint, GridItem } from './layouts';
import type { RawRange } from './timeRange';

/** A tile: which widget draws it, the widget's options (the widget checks them) and its queries. */
export interface Widget {
  id: string;
  type: string;
  title: string;
  options: unknown;
  queries: Query[];
}

/** A dashboard as the UI uses it. Never the wire shape. */
export interface Dashboard {
  id: string;
  title: string;
  description: string;
  tags: string[];
  updatedAt: Date;
  /** Defaults; the URL overrides them. */
  timeRange: RawRange;
  refresh: string;
  /** In the reading order of the `lg` layout, so keyboard order follows the screen. */
  widgets: Widget[];
  layouts: Record<Breakpoint, GridItem[]>;
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
