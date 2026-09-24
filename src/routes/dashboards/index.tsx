import { createFileRoute } from '@tanstack/react-router';
import { DashboardList } from '@/features/dashboards/components/DashboardList';
import { dashboardsQuery } from '@/features/dashboards/api/queries';
import { ListSkeleton } from '@/components/feedback/skeletons/Skeletons';

export const Route = createFileRoute('/dashboards/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardsQuery()),
  pendingComponent: ListSkeleton,
  component: DashboardList,
});
