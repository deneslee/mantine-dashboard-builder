import {
  Alert,
  Anchor,
  Breadcrumbs,
  Button,
  Code,
  Group,
  List,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconExternalLink,
  IconInfoCircle,
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { Page } from '@/design-system';
import { SentryIcon } from '../sentry/components/SentryIcon';
import { SentryStatusCard } from '../sentry/components/SentryStatusCard';
import { SentryVerificationCard } from '../sentry/components/SentryVerificationCard';

export function SentryPage() {
  return (
    <Page.Root>
      <Page.Header
        title={
          <Group gap="xs" align="center">
            <ThemeIcon size="lg" radius="md" variant="light" color="teal">
              <SentryIcon size={22} />
            </ThemeIcon>
            <span>Sentry Integration</span>
          </Group>
        }
        description="Real-time error tracking, structured logging, app metrics, session replay, and performance tracing"
        actions={
          <Button
            variant="default"
            size="sm"
            leftSection={<IconArrowLeft size={16} />}
            renderRoot={(props) => <Link to="/integrations" {...props} />}
          >
            All Integrations
          </Button>
        }
      />
      <Page.Body>
        <Stack gap="lg">
          <Breadcrumbs separator="/" fz="xs">
            <Anchor component={Link} to="/integrations" fz="xs">
              Integrations
            </Anchor>
            <Text fz="xs" c="dimmed">
              Sentry
            </Text>
          </Breadcrumbs>

          {/* 1. Immediate Verification Section */}
          <SentryVerificationCard />

          {/* 2. Live Subsystem Status */}
          <SentryStatusCard />

          {/* 3. Setup & Environment Documentation */}
          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <Group gap="xs">
                <IconInfoCircle size={18} color="var(--mantine-color-blue-6)" />
                <Text fw={600} size="sm">
                  Configuration & Environment Variables
                </Text>
              </Group>

              <Text size="xs" c="dimmed">
                Configure your Sentry project credentials via environment variables:
              </Text>

              <List size="xs" spacing="xs">
                <List.Item>
                  <Text span fw={600}>
                    VITE_SENTRY_DSN
                  </Text>
                  : Paste your Client Key DSN from your Sentry project settings into{' '}
                  <Code>.env.local</Code>.
                </List.Item>
                <List.Item>
                  <Text span fw={600}>
                    VITE_SENTRY_TRACES_SAMPLE_RATE
                  </Text>
                  : Controls transaction tracing sample rate (defaults to <Code>1.0</Code> in dev,{' '}
                  <Code>0.1</Code> in prod).
                </List.Item>
                <List.Item>
                  <Text span fw={600}>
                    VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE
                  </Text>
                  : Controls continuous session replay sample rate (defaults to <Code>0.1</Code>).
                </List.Item>
                <List.Item>
                  <Text span fw={600}>
                    VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE
                  </Text>
                  : Samples 100% (<Code>1.0</Code>) of sessions experiencing an unhandled error.
                </List.Item>
              </List>

              <Alert variant="light" color="blue" title="Sentry Project Dashboard">
                <Text size="xs">
                  Once events are fired via the verification buttons above, visit your project at{' '}
                  <Anchor href="https://sentry.io" target="_blank" rel="noreferrer" size="xs">
                    sentry.io <IconExternalLink size={12} />
                  </Anchor>{' '}
                  to view incoming Issues, Logs, Metrics, Session Replays, and Performance traces.
                </Text>
              </Alert>
            </Stack>
          </Paper>
        </Stack>
      </Page.Body>
    </Page.Root>
  );
}
