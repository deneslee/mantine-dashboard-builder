import {
  Alert,
  Anchor,
  Badge,
  Breadcrumbs,
  Button,
  Code,
  Group,
  List,
  Paper,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  IconActivity,
  IconArrowLeft,
  IconExternalLink,
  IconInfoCircle,
  IconSettings,
  IconTerminal2,
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Page } from '@/design-system/components/Page/Page';
import { getSentryStatus } from '@/lib/sentry/client';
import { SentryIcon } from './sentry/SentryIcon';
import { SentrySettings } from './sentry/SentrySettings';
import { SentryStatusCard } from './sentry/SentryStatusCard';
import { SentryVerificationCard } from './sentry/SentryVerificationCard';

export function SentryPage() {
  const [activeTab, setActiveTab] = useState<string | null>('verification');
  const [status, setStatus] = useState(getSentryStatus);

  const refreshStatus = () => {
    setStatus(getSentryStatus());
  };

  return (
    <Page.Root>
      <Page.Header
        title={
          <Group gap="xs" align="center">
            <ThemeIcon size="lg" radius="md" variant="filled" color="#7553FF" c="white">
              <SentryIcon size={22} />
            </ThemeIcon>
            <span>Sentry Integration</span>
            <Badge color={status.isConfigured ? 'teal' : 'yellow'} variant="light" size="sm">
              {status.isConfigured ? 'Connected' : 'Action Required: Set DSN'}
            </Badge>
          </Group>
        }
        description="Application monitoring, error tracking, structured logging, app metrics, session replay, and tracing"
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
        <Stack gap="md">
          <Breadcrumbs separator="/" fz="xs">
            <Anchor component={Link} to="/integrations" fz="xs">
              Integrations
            </Anchor>
            <Text fz="xs" c="dimmed">
              Sentry
            </Text>
          </Breadcrumbs>

          {!status.isConfigured && (
            <Alert
              color="yellow"
              variant="light"
              title="Sentry DSN Not Yet Set"
              icon={<IconInfoCircle size={16} />}
            >
              <Group justify="space-between" align="center" wrap="wrap">
                <Text size="xs">
                  Your project DSN is not configured. Go to the{' '}
                  <Text span fw={600}>
                    Settings
                  </Text>{' '}
                  tab to enter your DSN, or save it to <Code>.env.local</Code>.
                </Text>
                <Button size="xs" variant="outline" color="yellow" onClick={() => setActiveTab('settings')}>
                  Configure DSN in Settings
                </Button>
              </Group>
            </Alert>
          )}

          <Tabs value={activeTab} onChange={setActiveTab} keepMounted={false}>
            <Tabs.List mb="md">
              <Tabs.Tab value="verification" leftSection={<IconTerminal2 size={16} />}>
                Live Verification & Activity
              </Tabs.Tab>
              <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />}>
                Settings & DSN
              </Tabs.Tab>
              <Tabs.Tab value="diagnostics" leftSection={<IconActivity size={16} />}>
                Subsystems & Documentation
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="verification">
              <SentryVerificationCard onGoToSettings={() => setActiveTab('settings')} />
            </Tabs.Panel>

            <Tabs.Panel value="settings">
              <SentrySettings onConfigChanged={refreshStatus} />
            </Tabs.Panel>

            <Tabs.Panel value="diagnostics">
              <Stack gap="lg">
                <SentryStatusCard />

                <Paper withBorder p="md" radius="md">
                  <Stack gap="sm">
                    <Group gap="xs">
                      <IconInfoCircle size={18} color="var(--mantine-color-blue-6)" />
                      <Text fw={600} size="sm">
                        Environment Variables Reference
                      </Text>
                    </Group>

                    <Text size="xs" c="dimmed">
                      You can also configure Sentry globally via environment variables:
                    </Text>

                    <List size="xs" spacing="xs">
                      <List.Item>
                        <Text span fw={600}>
                          VITE_SENTRY_DSN
                        </Text>
                        : Your Sentry project client key DSN.
                      </List.Item>
                      <List.Item>
                        <Text span fw={600}>
                          VITE_SENTRY_TRACES_SAMPLE_RATE
                        </Text>
                        : Tracing rate for TanStack Router navigation spans (default: <Code>1.0</Code> in dev,{' '}
                        <Code>0.1</Code> in prod).
                      </List.Item>
                      <List.Item>
                        <Text span fw={600}>
                          VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE
                        </Text>
                        : Session replay sampling rate (default: <Code>0.1</Code>).
                      </List.Item>
                      <List.Item>
                        <Text span fw={600}>
                          VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE
                        </Text>
                        : Error session replay rate (default: <Code>1.0</Code>).
                      </List.Item>
                    </List>

                    <Alert variant="light" color="blue" title="Sentry Project Dashboard">
                      <Text size="xs">
                        View real-time incoming events, stack traces, and session replays at{' '}
                        <Anchor href="https://sentry.io" target="_blank" rel="noreferrer" size="xs">
                          sentry.io <IconExternalLink size={12} />
                        </Anchor>
                        .
                      </Text>
                    </Alert>
                  </Stack>
                </Paper>
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Page.Body>
    </Page.Root>
  );
}
