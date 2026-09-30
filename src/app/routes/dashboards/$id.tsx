import { createFileRoute, notFound, stripSearchParams } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { DashboardProvider } from '@/features/dashboards/state/DashboardProvider';
import { DashboardView } from '@/features/dashboards/DashboardPage';
import { dashboardQuery } from '@/features/dashboards/data/dashboardQueries';
import { dashboardSearch } from '@/core/time/timeRange';
import { DashboardRegistryContext } from '@/plugins/usePlugins';
import { dashboardTabs } from '@/features/dashboards/dashboardTabs';
import { DashboardSkeleton } from '@/ui/components/Skeletons';
import { isAppError } from '@/core/errors/AppError';
import { registry } from '../../plugins';

export const Route = createFileRoute('/dashboards/$id')({
  staticData: {
    contextTabs: dashboardTabs,
    crumb: (data) => (data as { title?: string } | undefined)?.title,
  },
  // Time range and refresh; the loader doesn't depend on them, so changing them never reloads the document.
  validateSearch: dashboardSearch,
  search: { middlewares: [stripSearchParams({ mode: 'view' })] },
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
  const { id } = Route.useParams();
  const { mode } = Route.useSearch();
  const { data } = useSuspenseQuery(dashboardQuery(id));
  return (
    <DashboardRegistryContext value={registry}>
      <DashboardProvider key={id} dashboard={data} mode={mode}>
        <DashboardView />
      </DashboardProvider>
    </DashboardRegistryContext>
  );
}
