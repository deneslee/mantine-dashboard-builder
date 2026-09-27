import { createFileRoute } from '@tanstack/react-router';

/** Groups the dashboard routes, so a dashboard's trail starts with "Dashboards". Renders its child. */
export const Route = createFileRoute('/dashboards')({
  staticData: { crumb: 'Dashboards' },
});
