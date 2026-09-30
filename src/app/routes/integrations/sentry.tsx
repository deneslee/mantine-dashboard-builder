import { createFileRoute } from '@tanstack/react-router';
import { SentryPage } from '@/features/integrations/SentryPage';

export const Route = createFileRoute('/integrations/sentry')({
  staticData: { crumb: 'Sentry' },
  component: SentryPage,
});
