import { createFileRoute } from '@tanstack/react-router';
import { ConnectionPage } from '@/features/datasources/ConnectionPage';

export const Route = createFileRoute('/datasources/new')({
  staticData: { crumb: 'New connection' },
  validateSearch: (search: Record<string, unknown>): { type?: string } => ({
    type: typeof search.type === 'string' ? search.type : undefined,
  }),
  component: NewConnectionRoute,
});

function NewConnectionRoute() {
  const { type } = Route.useSearch();
  return <ConnectionPage type={type} />;
}
