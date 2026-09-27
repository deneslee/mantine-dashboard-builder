import { createFileRoute, notFound } from '@tanstack/react-router';
import { DashboardView } from '@/features/dashboards/components/DashboardView';
import { dashboardQuery } from '@/features/dashboards/api/queries';
import { dashboardSearch } from '@/features/dashboards/model/timeRange';
import { DashboardRegistryContext } from '@/features/dashboards/registry';
import { dashboardTabs } from '@/features/dashboards/tabs';
import { DashboardSkeleton } from '@/components/feedback/skeletons/Skeletons';
import { isAppError } from '@/lib/errors/AppError';
import { registry } from '../../registry';

export const Route = createFileRoute('/dashboards/$id')({
  staticData: {
    contextTabs: dashboardTabs,
    crumb: (data) => (data as { title?: string } | undefined)?.title,
  },
  // Time range and refresh; the loader doesn't depend on them, so changing them never reloads the document.
  validateSearch: (search) => dashboardSearch.parse(search),
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(dashboardQuery(params.id));
    } catch (e) {
      if (isAppError(e) && e.code === 'not_found') throw notFound();
      throw e;
    }
  },
  pendingComponent: DashboardSkeleton,
  component: DashboardRoute,
});

/** The app layer hands the widget and datasource plugins to the dashboard. */
function DashboardRoute() {
  return (
    <DashboardRegistryContext value={registry}>
      <DashboardView />
    </DashboardRegistryContext>
  );
}
