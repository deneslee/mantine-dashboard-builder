import { createFileRoute, notFound } from '@tanstack/react-router';
import { DashboardView } from '@/features/dashboards/components/DashboardView';
import { dashboardQuery } from '@/features/dashboards/api/queries';
import { dashboardTabs } from '@/features/dashboards/tabs';
import { DashboardSkeleton } from '@/components/feedback/skeletons/Skeletons';
import { isAppError } from '@/lib/errors/AppError';

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
