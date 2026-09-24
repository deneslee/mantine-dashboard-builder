import { createFileRoute } from '@tanstack/react-router';
import { DashboardList, dashboardsQuery } from '@/features/dashboards';
import { ListSkeleton } from '@/components/feedback';

export const Route = createFileRoute('/dashboards/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardsQuery()),
  pendingComponent: ListSkeleton,
  component: DashboardList,
});
