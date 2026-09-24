import { createFileRoute } from '@tanstack/react-router';
import { IntegrationsCatalog } from '@/integrations';

export const Route = createFileRoute('/integrations/')({
  component: IntegrationsCatalog,
});
