import { createFileRoute, notFound, redirect, stripSearchParams } from '@tanstack/react-router';
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
import { getActivePlace, type ResolvedPlace } from '@/lib/records/activeRecordProvider';
import type { LoadedDashboard } from '@/features/dashboards/data/dashboardSource';

/**
 * What the route loads: the dashboard with where it came from, and the place in use when it was opened.
 * The page keeps both: a later switch of the place does not move an open dashboard (it shows a banner).
 */
export interface DashboardRouteData {
  place: ResolvedPlace;
  loaded: LoadedDashboard;
}

export const Route = createFileRoute('/dashboards/$id')({
  staticData: {
    contextTabs: dashboardTabs,
    crumb: (data) => (data as DashboardRouteData | undefined)?.loaded.document.title,
  },
  // Time range and refresh; the loader doesn't depend on them, so changing them never reloads the document.
  validateSearch: dashboardSearchSchema,
  search: { middlewares: [stripSearchParams({ mode: 'view' })] },
  // Opening a dashboard with unsaved edits lands in edit mode, where they can be saved or discarded.
  // Only on entry: leaving edit mode with a draft must stay in view mode.
  beforeLoad: ({ params, search, cause }) => {
    if (cause === 'enter' && search.mode !== 'edit' && hasDraft(getActivePlace().id, params.id))
      throw redirect({ to: '/dashboards/$id', params, search: { ...search, mode: 'edit' }, replace: true });
  },
  loader: async ({ context, params, cause, location }): Promise<DashboardRouteData> => {
    // The place is captured here, once: the page keeps it for as long as it stays open.
    const place = getActivePlace();
    let loaded;
    try {
      // The cached document when there is one; `ensureQueryData` is deprecated for this.
      loaded = await context.queryClient.query({ ...dashboardQuery(place, params.id), staleTime: 'static' });
    } catch (e) {
      if (isAppError(e) && e.code === 'not_found') throw notFound();
      throw e;
    }
    // On entry (not a search change or a hover preload) the first screen's widget queries and code
    // start, unawaited. The search is read once here, so it stays out of the loader's dependencies.
    if (cause === 'enter')
      startWidgetQueries(
        context.queryClient,
        loaded.document,
        dashboardSearchSchema.parse(location.search),
        plugins,
      );
    return { place, loaded };
  },
  pendingComponent: GridSkeleton,
  component: DashboardRoute,
});

function DashboardRoute() {
  const { id } = Route.useParams();
  const { place, loaded } = Route.useLoaderData();
  return (
    <DashboardProvider key={`${place.id}:${id}`} dashboard={loaded}>
      <DashboardPage />
    </DashboardProvider>
  );
}
