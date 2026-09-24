import { Alert, Badge, Button, Group, Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import {
  IconAlertCircle,
  IconBomb,
  IconChartBar,
  IconCheck,
  IconFileText,
  IconFlame,
} from '@tabler/icons-react';
import { useState } from 'react';
import * as Sentry from '@sentry/react';
import { notify } from '@/features/notifications';
import { getSentryStatus } from '../client';

export function SentryVerificationCard() {
  const [status] = useState(getSentryStatus);
  const [logCount, setLogCount] = useState(0);
  const [metricCount, setMetricCount] = useState(0);

  const handleBreakTheWorld = () => {
    // 1. Send structured log
    Sentry.logger.info('User triggered test error', {
      action: 'test_error_button_click',
    });

    // 2. Send test metric
    Sentry.metrics.count('test_counter', 1);

    // 3. Throw test error (exercises error tracking & triggers session replay on error)
    throw new Error('This is your first error!');
  };

  const handleSendLog = () => {
    const next = logCount + 1;
    setLogCount(next);
    Sentry.logger.info(`Verification log message #${next}`, {
      source: 'integrations/sentry',
      count: next,
      timestamp: new Date().toISOString(),
    });
    notify.success({
      title: 'Log sent to Sentry',
      message: `Emitted structured log #${next} via Sentry.logger.info`,
    });
  };

  const handleSendMetric = () => {
    const next = metricCount + 1;
    setMetricCount(next);
    Sentry.metrics.count('dashboard_manual_test_metric', 1, {
      attributes: { source: 'verification_card' },
    });
    notify.success({
      title: 'Metric sent to Sentry',
      message: `Incremented dashboard_manual_test_metric counter (+1)`,
    });
  };

  const handleHandledError = () => {
    try {
      throw new Error('Manual test error (handled)');
    } catch (e) {
      Sentry.captureException(e, {
        tags: { verification: 'manual_handled' },
      });
      notify.info({
        title: 'Handled error captured',
        message: 'Exception reported to Sentry without crashing UI',
      });
    }
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <ThemeIcon color={status.isConfigured ? 'teal' : 'yellow'} variant="light" size="md">
              {status.isConfigured ? <IconCheck size={18} /> : <IconAlertCircle size={18} />}
            </ThemeIcon>
            <div>
              <Text fw={600} size="sm">
                Sentry Connection Verification
              </Text>
              <Text size="xs" c="dimmed">
                Verify event transmission for Errors, Logs, App Metrics, Replay, and Tracing
              </Text>
            </div>
          </Group>
          <Badge color={status.isConfigured ? 'teal' : 'yellow'} variant="light">
            {status.isConfigured ? 'DSN Connected' : 'DSN Not Set'}
          </Badge>
        </Group>

        {!status.isConfigured && (
          <Alert color="yellow" variant="light" title="Missing Sentry DSN">
            Set <Text span fw={600}>VITE_SENTRY_DSN</Text> in your <Text span fw={600}>.env.local</Text> file to send events to your project.
          </Alert>
        )}

        <Text size="xs" c="dimmed">
          Click the official verification button below to emit a structured log, increment an application metric, and throw an error to test session replay and error reporting.
        </Text>

        <Group gap="sm" wrap="wrap">
          <Button
            color="red"
            variant="filled"
            size="sm"
            leftSection={<IconFlame size={16} />}
            onClick={handleBreakTheWorld}
          >
            Break the world
          </Button>

          <Button
            variant="default"
            size="sm"
            leftSection={<IconFileText size={16} />}
            onClick={handleSendLog}
          >
            Send Test Log
          </Button>

          <Button
            variant="default"
            size="sm"
            leftSection={<IconChartBar size={16} />}
            onClick={handleSendMetric}
          >
            Send Test Metric
          </Button>

          <Button
            variant="default"
            size="sm"
            leftSection={<IconBomb size={16} />}
            onClick={handleHandledError}
          >
            Capture Handled Error
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
