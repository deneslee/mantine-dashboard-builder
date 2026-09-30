import { createFileRoute } from '@tanstack/react-router';
import { DashboardList } from '@/features/dashboards/DashboardListPage';
import { dashboardsQuery } from '@/features/dashboards/data/dashboardQueries';
import { ListSkeleton } from '@/ui/components/Skeletons';

export const Route = createFileRoute('/dashboards/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardsQuery()),
  pendingComponent: ListSkeleton,
  component: DashboardList,
});
