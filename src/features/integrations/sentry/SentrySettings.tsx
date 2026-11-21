import {
  Alert,
  Anchor,
  Box,
  Button,
  Code,
  Group,
  NumberInput,
  Paper,
  PasswordInput,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import {
  IconCheck,
  IconDeviceFloppy,
  IconExternalLink,
  IconInfoCircle,
  IconRotate,
} from '@tabler/icons-react';
import { useState } from 'react';
import { notify } from '@/lib/notify/notify';
import { applySentryConfig, getSentryConfig, resetSentry, type ApplyResult } from '@/lib/sentry/runtime';
import type { SentryConfig } from '@/lib/sentry/sentryConfig';

/** What the user sees after a save or reset, per outcome. */
const RESULT_MESSAGES: Record<ApplyResult, { title: string; message: string }> = {
  started: { title: 'Sentry started', message: 'Sentry is running with these settings.' },
  reload: {
    title: 'Settings saved: reload to apply',
    message: 'Sentry is already running. Reload the page to use the new settings.',
  },
  off: { title: 'Settings saved: Sentry is off', message: 'No DSN is set, so nothing is sent.' },
};

export function SentrySettings({ onConfigChanged }: { onConfigChanged?: () => void }) {
  const [config, setConfig] = useState<SentryConfig>(getSentryConfig);
  const [result, setResult] = useState<ApplyResult | null>(null);

  const handleSave = () => {
    const outcome = applySentryConfig(config);
    setResult(outcome);
    notify.success(RESULT_MESSAGES[outcome]);
    onConfigChanged?.();
  };

  const handleReset = () => {
    const { config: defaults, result: outcome } = resetSentry();
    setConfig(defaults);
    setResult(outcome);
    notify.info(RESULT_MESSAGES[outcome]);
    onConfigChanged?.();
  };

  return (
    <Paper withBorder p="lg" radius="md">
      <Stack gap="lg">
        <div>
          <Text fw={600} size="md">
            Sentry Configuration
          </Text>
          <Text size="xs" c="dimmed">
            Manage your Sentry project DSN, environment parameters, and telemetry sampling rates
          </Text>
        </div>

        {result && (
          <Alert
            color={result === 'started' ? 'teal' : 'gray'}
            variant="light"
            icon={<IconCheck size={16} />}
            title={RESULT_MESSAGES[result].title}
            withCloseButton
            onClose={() => setResult(null)}
          >
            {RESULT_MESSAGES[result].message}
          </Alert>
        )}

        <Stack gap="md">
          <div>
            <PasswordInput
              label="Sentry DSN"
              description={
                <span>
                  Found in Sentry under{' '}
                  <Text span fw={500}>
                    Settings &gt; Client Keys (DSN)
                  </Text>
                  . Format: <Code>https://&lt;key&gt;@o&lt;org&gt;.ingest.sentry.io/&lt;project&gt;</Code>
                </span>
              }
              placeholder="https://examplePublicKey@o000000.ingest.sentry.io/0000000"
              value={config.dsn}
              onChange={(e) => setConfig((prev) => ({ ...prev, dsn: e.currentTarget.value }))}
            />
            <Text size="xs" c="dimmed" mt={4}>
              Tip: You can also find your DSN at{' '}
              <Anchor href="https://sentry.io" target="_blank" rel="noreferrer" size="xs">
                sentry.io <IconExternalLink size={10} />
              </Anchor>
            </Text>
          </div>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
            <TextInput
              label="Environment"
              description="e.g. development, staging, production"
              value={config.environment}
              onChange={(e) => setConfig((prev) => ({ ...prev, environment: e.currentTarget.value }))}
            />
            <TextInput
              label="Release Tag"
              description="Application release identifier"
              value={config.release}
              onChange={(e) => setConfig((prev) => ({ ...prev, release: e.currentTarget.value }))}
            />
          </SimpleGrid>

          <Paper withBorder p="md" radius="sm">
            <Stack gap="md">
              <div>
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    Traces Sample Rate: {Math.round(config.tracesSampleRate * 100)}%
                  </Text>
                  <NumberInput
                    size="xs"
                    w={80}
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.tracesSampleRate}
                    onChange={(val) =>
                      setConfig((prev) => ({
                        ...prev,
                        tracesSampleRate: typeof val === 'number' ? val : 1,
                      }))
                    }
                  />
                </Group>
                <Text size="xs" c="dimmed" mb="xs">
                  Percentage of transactions captured for performance tracing and TanStack Router navigation
                  spans.
                </Text>
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={config.tracesSampleRate}
                  onChange={(val) => setConfig((prev) => ({ ...prev, tracesSampleRate: val }))}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 0.5, label: '50%' },
                    { value: 1, label: '100%' },
                  ]}
                />
              </div>

              <Box mt="md">
                <Group justify="space-between">
                  <Text size="sm" fw={500}>
                    Session Replay Sample Rate: {Math.round(config.replaysSessionSampleRate * 100)}%
                  </Text>
                  <NumberInput
                    size="xs"
                    w={80}
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.replaysSessionSampleRate}
                    onChange={(val) =>
                      setConfig((prev) => ({
                        ...prev,
                        replaysSessionSampleRate: typeof val === 'number' ? val : 0.1,
                      }))
                    }
                  />
                </Group>
                <Text size="xs" c="dimmed" mb="xs">
                  Percentage of normal user sessions recorded for Session Replay.
                </Text>
                <Slider
                  min={0}
                  max={1}
                  step={0.05}
                  value={config.replaysSessionSampleRate}
                  onChange={(val) => setConfig((prev) => ({ ...prev, replaysSessionSampleRate: val }))}
                  marks={[
                    { value: 0, label: '0%' },
                    { value: 0.1, label: '10%' },
                    { value: 1, label: '100%' },
                  ]}
                />
              </Box>

              <Switch
                label="Replay on Error (100%)"
                description="Always record and transmit a session replay when an unhandled error occurs"
                checked={config.replaysOnErrorSampleRate > 0}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    replaysOnErrorSampleRate: e.currentTarget.checked ? 1.0 : 0,
                  }))
                }
              />

              <Switch
                label="Structured Logging (enableLogs)"
                description="Forward Sentry.logger calls and console methods to Sentry Logs"
                checked={config.enableLogs}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    enableLogs: e.currentTarget.checked,
                  }))
                }
              />
            </Stack>
          </Paper>

          <Alert variant="light" color="gray" icon={<IconInfoCircle size={16} />} title="Local Persistence">
            Settings saved here are stored in your browser's <Code>localStorage</Code> and take precedence
            over defaults.
          </Alert>

          <Group justify="space-between">
            <Button variant="default" size="sm" leftSection={<IconRotate size={16} />} onClick={handleReset}>
              Reset to Defaults
            </Button>

            <Button size="sm" color="teal" leftSection={<IconDeviceFloppy size={16} />} onClick={handleSave}>
              Save settings
            </Button>
          </Group>
        </Stack>
      </Stack>
    </Paper>
  );
}
