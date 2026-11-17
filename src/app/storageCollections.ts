import { dashboardKeys } from '@/features/dashboards/data/dashboardQueries';
import { countDrafts } from '@/features/dashboards/data/drafts';
import { validateDashboardRecords } from '@/features/dashboards/data/validateDashboardRecords';
import type { StorageCollection } from '@/features/storage/collections';

/**
 * The collections the Storage pages move between places. The Storage feature does not know dashboards;
 * this is where it meets them: how to check their records, what to refresh after a replace, and where
 * unsaved edits are counted.
 */
export const storageCollections: StorageCollection[] = [
  {
    id: 'dashboards',
    label: 'Dashboards',
    singular: 'dashboard',
    validate: validateDashboardRecords,
    onReplaced: (queryClient, placeId) => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.list(placeId) });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.details(placeId) });
    },
    countUnsaved: countDrafts,
  },
];
