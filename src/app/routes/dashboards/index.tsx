import { createFileRoute } from '@tanstack/react-router';
import { DashboardListPage } from '@/features/dashboards/DashboardListPage';
import { dashboardListQuery } from '@/features/dashboards/data/dashboardQueries';
import { ListSkeleton } from '@/ui/components/Skeletons';

export const Route = createFileRoute('/dashboards/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardListQuery()),
  pendingComponent: ListSkeleton,
  component: DashboardListPage,
});
