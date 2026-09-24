import { createFileRoute } from '@tanstack/react-router';
import { IntegrationsCatalog } from '@/features/integrations/components/IntegrationsCatalog';

export const Route = createFileRoute('/integrations/')({
  component: IntegrationsCatalog,
});
