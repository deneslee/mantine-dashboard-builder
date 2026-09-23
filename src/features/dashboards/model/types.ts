export type WidgetKind = 'kpis' | 'regions' | 'broken' | 'trend';
export type ChartForm = 'area' | 'line' | 'bar';

/** Grid cell in the `lg` layout (12 columns); smaller breakpoints are derived from it. */
export interface WidgetPlacement {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A tile on a dashboard. Stand-in until the dashboard schema (phase 2), which adds options,
 * queries and per-breakpoint layouts.
 */
export interface DashboardWidget {
  id: string;
  kind: WidgetKind;
  title: string;
  placement: WidgetPlacement;
  /** Chart form for `trend` widgets. */
  chart?: ChartForm;
}

/** What every widget component receives. */
export interface WidgetProps {
  dashboardId: string;
  widget: DashboardWidget;
}

/** Domain shape the UI uses. Never the wire shape. */
export interface DashboardSummary {
  id: string;
  title: string;
  description: string;
  updatedAt: Date;
  widgetCount: number;
  tags: string[];
}
