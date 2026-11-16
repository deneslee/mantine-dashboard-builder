import { createFileRoute, notFound, redirect, stripSearchParams } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { DashboardProvider } from '@/features/dashboards/state/DashboardProvider';
import { DashboardPage } from '@/features/dashboards/DashboardPage';
import { dashboardQuery } from '@/features/dashboards/data/dashboardQueries';
import { hasDraft } from '@/features/dashboards/data/drafts';
import { dashboardSearchSchema } from '@/features/dashboards/dashboardSearch';
import { startWidgetQueries } from '@/features/dashboards/data/startWidgetQueries';
import { plugins } from '@/app/plugins';
import { dashboardTabs } from '@/features/dashboards/dashboardTabs';
import { GridSkeleton } from '@/ui/components/Skeletons';
import { isAppError } from '@/core/errors/AppError';

export const Route = createFileRoute('/dashboards/$id')({
  staticData: {
    contextTabs: dashboardTabs,
    crumb: (data) => (data as { title?: string } | undefined)?.title,
  },
  // Time range and refresh; the loader doesn't depend on them, so changing them never reloads the document.
  validateSearch: dashboardSearchSchema,
  search: { middlewares: [stripSearchParams({ mode: 'view' })] },
  // Opening a dashboard with unsaved edits lands in edit mode, where they can be saved or discarded.
  // Only on entry: leaving edit mode with a draft must stay in view mode.
  beforeLoad: ({ params, search, cause }) => {
    if (cause === 'enter' && search.mode !== 'edit' && hasDraft(params.id))
      throw redirect({ to: '/dashboards/$id', params, search: { ...search, mode: 'edit' }, replace: true });
  },
  loader: async ({ context, params, cause, location }) => {
    let dashboard;
    try {
      // The cached document when there is one; `ensureQueryData` is deprecated for this.
      dashboard = await context.queryClient.query({ ...dashboardQuery(params.id), staleTime: 'static' });
    } catch (e) {
      if (isAppError(e) && e.code === 'not_found') throw notFound();
      throw e;
    }
    // On entry (not a search change or a hover preload) the first screen's widget queries and code
    // start, unawaited. The search is read once here, so it stays out of the loader's dependencies.
    if (cause === 'enter')
      startWidgetQueries(
        context.queryClient,
        dashboard,
        dashboardSearchSchema.parse(location.search),
        plugins,
      );
    return dashboard;
  },
  pendingComponent: GridSkeleton,
  component: DashboardRoute,
});

function DashboardRoute() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(dashboardQuery(id));
  return (
    <DashboardProvider key={id} dashboard={data}>
      <DashboardPage />
    </DashboardProvider>
  );
}
