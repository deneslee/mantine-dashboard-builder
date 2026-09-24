import { createFileRoute } from '@tanstack/react-router';
import { SentryPage } from '@/features/integrations/components/SentryPage';

export const Route = createFileRoute('/integrations/sentry')({
  component: SentryPage,
});
