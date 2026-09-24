import { getSentryStatus } from '@/lib/sentry/client';
import { SentryIcon } from './components/sentry/SentryIcon';
import type { IntegrationDefinition } from './types';

export function getIntegrations(): IntegrationDefinition[] {
  const sentryStatus = getSentryStatus();

  return [
    {
      id: 'sentry',
      name: 'Sentry',
      description:
        'Application performance monitoring, real-time error tracking, structured logging, application metrics, and session replay.',
      category: 'Observability',
      status: sentryStatus.isConfigured ? 'connected' : 'not_configured',
      to: '/integrations/sentry',
      features: ['Errors', 'Logs', 'App Metrics', 'Session Replay', 'Tracing'],
      icon: SentryIcon,
    },
  ];
}
