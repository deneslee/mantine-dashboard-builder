import { createFileRoute } from '@tanstack/react-router';
import { SentryPage } from '@/integrations';

export const Route = createFileRoute('/integrations/sentry')({
  component: SentryPage,
});
