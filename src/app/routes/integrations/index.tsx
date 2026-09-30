import { createFileRoute } from '@tanstack/react-router';
import { IntegrationsCatalog } from '@/features/integrations/IntegrationsPage';

export const Route = createFileRoute('/integrations/')({
  component: IntegrationsCatalog,
});
