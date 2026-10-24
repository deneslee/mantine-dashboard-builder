import { createFileRoute } from '@tanstack/react-router';
import { ConnectionPage } from '@/features/datasources/ConnectionPage';

export const Route = createFileRoute('/datasources/$id')({
  staticData: { crumb: 'Connection' },
  component: ConnectionRoute,
});

function ConnectionRoute() {
  const { id } = Route.useParams();
  return <ConnectionPage key={id} id={id} />;
}
