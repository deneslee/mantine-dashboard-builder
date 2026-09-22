/** Domain shape the UI uses. Never the wire shape. */
export interface DashboardSummary {
  id: string;
  title: string;
  description: string;
  updatedAt: Date;
  widgetCount: number;
  tags: string[];
}
