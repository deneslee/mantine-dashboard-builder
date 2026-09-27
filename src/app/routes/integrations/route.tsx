import { createFileRoute } from '@tanstack/react-router';

/** Groups the integration routes, so an integration's trail starts with "Integrations". Renders its child. */
export const Route = createFileRoute('/integrations')({
  staticData: { crumb: 'Integrations' },
});
