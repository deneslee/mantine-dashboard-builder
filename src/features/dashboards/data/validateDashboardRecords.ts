import { storedDashboardSchema } from '@/core/dashboard/dashboardSchema';
import type { StoredRecord } from '@/core/records/RecordProvider';

/** What is wrong with records meant to be dashboards: not a dashboard, or a record id that is not its dashboard's. */
export function validateDashboardRecords(records: StoredRecord[]): string[] {
  return records.flatMap((record) => {
    const parsed = storedDashboardSchema.safeParse(record.data);
    if (!parsed.success) return [`Record "${record.id}" is not a valid dashboard`];
    if (parsed.data.id !== record.id)
      return [`Record "${record.id}" holds the dashboard "${parsed.data.id}"`];
    return [];
  });
}
