import { createFileRoute, notFound } from '@tanstack/react-router';
import { DashboardView, dashboardQuery, dashboardTabs } from '@/features/dashboards';
import { DashboardSkeleton } from '@/components/feedback';
import { isAppError } from '@/lib/errors';

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
