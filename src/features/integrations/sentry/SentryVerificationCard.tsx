import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Button,
  Code,
  CopyButton,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconActivity,
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconCopy,
  IconExternalLink,
  IconFileText,
  IconFlame,
  IconPlayerPlay,
  IconTerminal2,
  IconTrash,
  IconWifi,
} from '@tabler/icons-react';
import { useState } from 'react';
import * as Sentry from '@sentry/react';
import { notify } from '@/lib/notify/notify';
import {
  getReplaySessionId,
  getSentryStatus,
  testSentryConnection,
  type ConnectionTestResult,
} from '@/lib/sentry/client';
import classes from './SentryVerificationCard.module.css';

interface ActivityLogItem {
  id: string;
  time: string;
  type: 'log' | 'metric' | 'error' | 'ping' | 'flush';
  badgeColor: string;
  message: string;
  details?: string;
}

interface DeliveryReceipt {
  actionName: string;
  eventId?: string;
  replayId?: string | null;
  durationMs: number;
  timestamp: string;
  summary: string;
}

export function SentryVerificationCard({ onGoToSettings }: { onGoToSettings?: () => void }) {
  const [status, setStatus] = useState(getSentryStatus);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);
  const [delivering, setDelivering] = useState(false);
  const [receipt, setReceipt] = useState<DeliveryReceipt | null>(null);
  const [logs, setLogs] = useState<ActivityLogItem[]>([
    {
      id: 'init',
      time: new Date().toLocaleTimeString(),
      type: 'ping',
      badgeColor: 'blue',
      message: 'Verification console ready. Sentry client initialized.',
      details: status.isConfigured ? `DSN: ${status.dsn}` : 'DSN: Not configured',
    },
  ]);

  const addLog = (type: ActivityLogItem['type'], badgeColor: string, message: string, details?: string) => {
    const item: ActivityLogItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      time: new Date().toLocaleTimeString(),
      type,
      badgeColor,
      message,
      details,
    };
    setLogs((prev) => [item, ...prev].slice(0, 50));
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    addLog('ping', 'yellow', 'Pinging Sentry connection and testing transport flush…');

    try {
      const result = await testSentryConnection();
      setConnectionResult(result);
      setStatus(getSentryStatus());

      if (result.ok) {
        addLog(
          'flush',
          'teal',
          `Connection verified! Transport flush succeeded in ${result.durationMs}ms`,
          result.eventId ? `Ping Event ID: ${result.eventId}` : undefined,
        );
        notify.success({
          title: 'Sentry Connected',
          message: result.message,
        });
      } else {
        addLog('error', 'red', `Connection test failed: ${result.message}`);
        notify.error({
          title: 'Connection Failed',
          message: result.message,
        });
      }
    } finally {
      setTestingConnection(false);
    }
  };

  const handleBreakTheWorld = async () => {
    setDelivering(true);
    const start = performance.now();
    const ts = new Date().toLocaleTimeString();

    // 1. Send structured log
    Sentry.logger.info('User triggered test error', {
      action: 'test_error_button_click',
      timestamp: new Date().toISOString(),
    });
    addLog(
      'log',
      'blue',
      'Sentry.logger.info: "User triggered test error"',
      'action: test_error_button_click',
    );

    // 2. Send test metric
    Sentry.metrics.count('test_counter', 1, {
      attributes: { source: 'verification_break_the_world' },
    });
    addLog('metric', 'grape', 'Sentry.metrics.count: "test_counter" +1');

    // 3. Capture exception (without crashing out of the page so the user sees immediate feedback!)
    let eventId = '';
    try {
      throw new Error('This is your first error!');
    } catch (err) {
      eventId = Sentry.captureException(err, {
        tags: { verification: 'break_the_world' },
      });
      addLog('error', 'red', 'Sentry.captureException: "This is your first error!"', `Event ID: ${eventId}`);
    }

    // 4. Flush transport to ensure transmission
    await Sentry.flush(2500);
    const durationMs = Math.round(performance.now() - start);
    const replayId = getReplaySessionId();

    addLog('flush', 'teal', `Envelope delivered to Sentry Ingest (${durationMs}ms)`, `Event ID: ${eventId}`);

    setReceipt({
      actionName: 'Break the world (Official Sentry Test)',
      eventId,
      replayId,
      durationMs,
      timestamp: ts,
      summary: 'Emitted structured log, incremented test_counter metric, and captured test exception.',
    });

    notify.success({
      title: 'Verification Event Delivered',
      message: `Event ID: ${eventId} sent in ${durationMs}ms`,
    });

    setDelivering(false);
  };

  const handleSendLog = async () => {
    setDelivering(true);
    const start = performance.now();
    const msg = `Dashboard structured log verification @ ${new Date().toLocaleTimeString()}`;

    Sentry.logger.info(msg, {
      source: 'live_verification',
      environment: status.environment,
    });
    addLog('log', 'blue', `Sentry.logger.info: "${msg}"`);

    await Sentry.flush(2000);
    const durationMs = Math.round(performance.now() - start);

    addLog('flush', 'teal', `Log envelope delivered (${durationMs}ms)`);
    setReceipt({
      actionName: 'Send Structured Log',
      durationMs,
      timestamp: new Date().toLocaleTimeString(),
      summary: `Dispatched Sentry.logger.info with environment=${status.environment}`,
    });

    notify.success({
      title: 'Log Sent to Sentry',
      message: `Delivered in ${durationMs}ms`,
    });
    setDelivering(false);
  };

  const handleSendMetric = async () => {
    setDelivering(true);
    const start = performance.now();

    Sentry.metrics.count('dashboard_manual_test_metric', 1, {
      attributes: { source: 'live_verification' },
    });
    addLog('metric', 'grape', 'Sentry.metrics.count: "dashboard_manual_test_metric" +1');

    await Sentry.flush(2000);
    const durationMs = Math.round(performance.now() - start);

    addLog('flush', 'teal', `Metric envelope delivered (${durationMs}ms)`);
    setReceipt({
      actionName: 'Emit App Metric',
      durationMs,
      timestamp: new Date().toLocaleTimeString(),
      summary: 'Incremented counter dashboard_manual_test_metric (+1)',
    });

    notify.success({
      title: 'Metric Sent to Sentry',
      message: `Delivered in ${durationMs}ms`,
    });
    setDelivering(false);
  };

  const handleHandledError = async () => {
    setDelivering(true);
    const start = performance.now();
    let eventId = '';

    try {
      throw new Error('Handled verification error test');
    } catch (e) {
      eventId = Sentry.captureException(e, {
        tags: { type: 'handled_test' },
      });
      addLog(
        'error',
        'orange',
        'Sentry.captureException: "Handled verification error test"',
        `Event ID: ${eventId}`,
      );
    }

    await Sentry.flush(2000);
    const durationMs = Math.round(performance.now() - start);
    const replayId = getReplaySessionId();

    addLog('flush', 'teal', `Error envelope delivered (${durationMs}ms)`, `Event ID: ${eventId}`);
    setReceipt({
      actionName: 'Capture Handled Error',
      eventId,
      replayId,
      durationMs,
      timestamp: new Date().toLocaleTimeString(),
      summary: 'Captured handled exception and transmitted stack trace to Sentry.',
    });

    notify.info({
      title: 'Error Captured',
      message: `Event ID: ${eventId}`,
    });
    setDelivering(false);
  };

  const currentReplayId = getReplaySessionId();

  return (
    <Paper withBorder p="lg" radius="md">
      <Stack gap="md">
        {/* Top Connection Status & Quick Diagnostic */}
        <Group justify="space-between" align="center" wrap="wrap">
          <Group gap="xs">
            <ThemeIcon color={status.isConfigured ? 'teal' : 'yellow'} variant="light" size="lg" radius="md">
              {status.isConfigured ? <IconCheck size={20} /> : <IconAlertCircle size={20} />}
            </ThemeIcon>
            <div>
              <Group gap="xs" align="center">
                <Text fw={600} size="md">
                  Live Sentry Connection
                </Text>
                <Badge color={status.isConfigured ? 'teal' : 'yellow'} variant="light">
                  {status.isConfigured ? 'DSN Active' : 'No DSN Configured'}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                {status.isConfigured
                  ? `Target: ${status.dsn} · Env: ${status.environment}`
                  : 'Enter your DSN in Settings to start transmitting live events'}
              </Text>
            </div>
          </Group>

          <Group gap="xs">
            <Button
              variant="default"
              size="xs"
              leftSection={<IconWifi size={14} />}
              loading={testingConnection}
              onClick={handleTestConnection}
            >
              Ping Sentry Connection
            </Button>
            {!status.isConfigured && onGoToSettings && (
              <Button size="xs" color="teal" onClick={onGoToSettings}>
                Open Settings
              </Button>
            )}
          </Group>
        </Group>

        {/* Connection Result Banner if available */}
        {connectionResult && (
          <Alert
            color={connectionResult.ok ? 'teal' : 'red'}
            variant="light"
            icon={connectionResult.ok ? <IconCheck size={16} /> : <IconAlertCircle size={16} />}
            title={connectionResult.ok ? 'Connection Validated' : 'Connection Failed'}
            withCloseButton
            onClose={() => setConnectionResult(null)}
          >
            <Text size="xs">{connectionResult.message}</Text>
          </Alert>
        )}

        {/* Active Session Replay Indicator */}
        <Paper withBorder p="xs" radius="sm">
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <div className={classes.pulsingDot} />
              <Text size="xs" fw={500}>
                Session Replay Recorder
              </Text>
              <Badge size="xs" variant="dot" color="teal">
                Active
              </Badge>
            </Group>
            <Text size="xs" c="dimmed">
              Session ID: <Code>{currentReplayId || 'Active (buffering segments)'}</Code>
            </Text>
          </Group>
        </Paper>

        <Divider />

        {/* Action Buttons Section */}
        <div>
          <Text fw={600} size="sm" mb={4}>
            Test & Verification Triggers
          </Text>
          <Text size="xs" c="dimmed" mb="sm">
            Trigger events below to view real-time delivery receipts and verify transmission directly on this
            page:
          </Text>

          <Group gap="sm" wrap="wrap">
            <Tooltip label="Official Sentry test: sends a log, increments metric, and captures exception">
              <Button
                color="red"
                size="sm"
                leftSection={<IconFlame size={16} />}
                loading={delivering}
                onClick={handleBreakTheWorld}
              >
                Break the world
              </Button>
            </Tooltip>

            <Button
              variant="default"
              size="sm"
              leftSection={<IconFileText size={16} />}
              loading={delivering}
              onClick={handleSendLog}
            >
              Send Test Log
            </Button>

            <Button
              variant="default"
              size="sm"
              leftSection={<IconActivity size={16} />}
              loading={delivering}
              onClick={handleSendMetric}
            >
              Emit App Metric
            </Button>

            <Button
              variant="default"
              size="sm"
              leftSection={<IconPlayerPlay size={16} />}
              loading={delivering}
              onClick={handleHandledError}
            >
              Capture Handled Error
            </Button>
          </Group>
        </div>

        {/* Real-Time Delivery Receipt Banner */}
        {receipt && (
          <Paper p="md" radius="md" className={classes.receiptCard}>
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Group gap="xs">
                  <ThemeIcon size="md" radius="xl" color="teal" variant="filled">
                    <IconCheck size={16} />
                  </ThemeIcon>
                  <div>
                    <Text size="sm" fw={600} c="teal">
                      Verification Delivery Receipt — {receipt.actionName}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {receipt.summary}
                    </Text>
                  </div>
                </Group>
                <Badge color="teal" variant="filled" size="sm">
                  Flushed ({receipt.durationMs}ms)
                </Badge>
              </Group>

              <Group gap="lg" mt={4} wrap="wrap">
                {receipt.eventId && (
                  <div>
                    <Text size="xs" c="dimmed">
                      Sentry Event ID
                    </Text>
                    <Group gap={4}>
                      <Code fw={600}>{receipt.eventId}</Code>
                      <CopyButton value={receipt.eventId}>
                        {({ copied, copy }) => (
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            color={copied ? 'teal' : 'gray'}
                            onClick={copy}
                          >
                            <IconCopy size={12} />
                          </ActionIcon>
                        )}
                      </CopyButton>
                    </Group>
                  </div>
                )}

                {receipt.replayId && (
                  <div>
                    <Text size="xs" c="dimmed">
                      Replay Session ID
                    </Text>
                    <Code>{receipt.replayId}</Code>
                  </div>
                )}

                <div>
                  <Text size="xs" c="dimmed">
                    Delivery Time
                  </Text>
                  <Group gap={4}>
                    <IconClock size={12} color="var(--mantine-color-dimmed)" />
                    <Text size="xs">{receipt.timestamp}</Text>
                  </Group>
                </div>

                {receipt.eventId && (
                  <div>
                    <Text size="xs" c="dimmed">
                      Sentry Dashboard
                    </Text>
                    <Anchor
                      href={`https://sentry.io/organizations/~/issues/?query=${receipt.eventId}`}
                      target="_blank"
                      rel="noreferrer"
                      size="xs"
                    >
                      View Issue in Sentry <IconExternalLink size={10} />
                    </Anchor>
                  </div>
                )}
              </Group>
            </Stack>
          </Paper>
        )}

        {/* Live On-Screen Event Terminal / Activity Stream */}
        <div>
          <Group justify="space-between" mb={6}>
            <Group gap="xs">
              <IconTerminal2 size={16} color="var(--mantine-color-dimmed)" />
              <Text size="xs" fw={600}>
                Live Event Activity Stream (On-Screen Feedback)
              </Text>
              <Badge size="xs" variant="light" color="gray">
                {logs.length} events
              </Badge>
            </Group>

            <Group gap="xs">
              <Button
                variant="subtle"
                size="compact-xs"
                color="gray"
                leftSection={<IconTrash size={12} />}
                onClick={() => setLogs([])}
              >
                Clear Stream
              </Button>
            </Group>
          </Group>

          <div className={classes.terminal}>
            {logs.length === 0 ? (
              <Text size="xs" c="dimmed" p="xs">
                No events recorded in this session. Trigger an action above to see real-time output.
              </Text>
            ) : (
              logs.map((item) => (
                <div key={item.id} className={classes.terminalLine}>
                  <span className={classes.terminalTimestamp}>[{item.time}]</span>
                  <Badge size="xs" variant="filled" color={item.badgeColor}>
                    {item.type.toUpperCase()}
                  </Badge>
                  <div>
                    <Text span size="xs" fw={500} c="white">
                      {item.message}
                    </Text>
                    {item.details && (
                      <Text size="xs" c="dimmed">
                        ↳ {item.details}
                      </Text>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Stack>
    </Paper>
  );
}
