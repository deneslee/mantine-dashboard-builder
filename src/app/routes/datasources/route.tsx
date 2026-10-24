import { createFileRoute } from '@tanstack/react-router';

/** Groups the data source routes, so a connection's trail starts with "Data sources". Renders its child. */
export const Route = createFileRoute('/datasources')({
  staticData: { crumb: 'Data sources' },
});
