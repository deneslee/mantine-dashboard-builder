import { z } from 'zod';
import type { Dashboard } from '@/core/dashboard/dashboardSchema';

/** The collection dashboards are saved in, in every place. */
export const DASHBOARDS_COLLECTION = 'dashboards';

/**
 * Where a loaded dashboard came from, and so where its Save goes. Fixed when the dashboard is loaded:
 * switching the place in use later changes neither.
 * - `record`: the place holds it, at this revision; a save sends exactly this revision.
 * - `seed`: the place has no record, the file in `public/data/dashboards/` was used; the first save creates it.
 */
export const dashboardSourceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('record'), placeId: z.string(), revision: z.number() }),
  z.object({ kind: z.literal('seed'), placeId: z.string() }),
]);

export type DashboardSource = z.infer<typeof dashboardSourceSchema>;

/**
 * A dashboard as a record's data: one field, because a provider's `update` merges top-level fields and
 * a dashboard must be replaced whole (a field removed from the document must not survive a save).
 */
export const toRecordData = (document: Dashboard) => ({ document });

/** The document a record holds; records written before `toRecordData` hold the fields directly. */
export const documentOf = (data: Record<string, unknown>): unknown =>
  data.document !== undefined ? data.document : data;

/** A dashboard with where it came from: what the editor, its draft and its Save carry. */
export interface LoadedDashboard {
  document: Dashboard;
  source: DashboardSource;
}
