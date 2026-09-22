import { createFileRoute, notFound } from '@tanstack/react-router';
import { DashboardView, dashboardQuery, dashboardTabs } from '@/features/dashboards';
import { DashboardSkeleton } from '@/features/loading';
import { isAppError } from '@/shared/errors';

export const Route = createFileRoute('/dashboards/$id')({
  staticData: { contextTabs: dashboardTabs },
  loader: async ({ context, params }) => {
    try {
      return await context.queryClient.ensureQueryData(dashboardQuery(params.id));
    } catch (e) {
      if (isAppError(e) && e.code === 'not_found') throw notFound();
      throw e;
    }
  },
  pendingComponent: DashboardSkeleton,
  component: DashboardView,
});
