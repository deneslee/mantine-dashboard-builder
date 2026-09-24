import { Anchor, Button, Group, Paper, SimpleGrid, Stack, Switch, Text, Title } from '@mantine/core';
import { useMutation } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { Page } from '@/design-system/components/Page/Page';
import { ErrorState } from '@/components/errors/ErrorState';
import { WidgetBoundary } from '@/components/errors/WidgetBoundary';
import {
  ChartSkeleton,
  DashboardSkeleton,
  PanelSkeleton,
  TableSkeleton,
  TextSkeleton,
} from '@/components/feedback/skeletons/Skeletons';
import { notify } from '@/lib/notify/notify';
import { useInbox } from '@/stores/inbox';
import { AppError } from '@/lib/errors/AppError';
import { wait } from '@/utils/wait';

/** Visual QA for chrome states. Not linked from the sidebar; open /debug. */
export function DebugPage() {
  const clearInbox = useInbox((s) => s.clear);

  return (
    <Page.Root>
      <Page.Header title="Debug" description="Fire notifications, throw errors and preview skeletons." />
      <Page.Body>
        <Stack gap="xl">
          <Section title="Notifications">
            <Group gap="xs">
              <Button variant="default" onClick={() => notify.success({ title: 'Dashboard saved' })}>
                Success
              </Button>
              <Button
                variant="default"
                onClick={() =>
                  notify.info({
                    title: 'Layout reset',
                    message: 'Widgets moved back to their default positions.',
                  })
                }
              >
                Info
              </Button>
              <Button
                variant="default"
                onClick={() =>
                  notify.warning({
                    title: 'Data source is slow',
                    message: 'Showing cached data from 5 minutes ago.',
                    source: 'Datadog',
                  })
                }
              >
                Warning
              </Button>
              <Button
                variant="default"
                onClick={() =>
                  notify.error({
                    title: 'Import failed',
                    message: 'Invalid JSON at line 12.',
                    source: 'Import',
                    action: { label: 'Retry', onClick: () => notify.info({ title: 'Retrying import' }) },
                  })
                }
              >
                Error with action
              </Button>
              <Button
                variant="default"
                onClick={() =>
                  [1, 2, 3].forEach(() =>
                    notify.error({ title: 'Widget failed to load', source: 'Sales overview' }),
                  )
                }
              >
                Error ×3 (dedupe)
              </Button>
              <Button
                variant="default"
                onClick={async () => {
                  const p = notify.progress('Exporting 3 dashboards', 'Preparing…');
                  await wait(1200);
                  p.update('Exporting 3 dashboards', '2 of 3 done');
                  await wait(1200);
                  p.done('Export ready', 'dashboards.json downloaded');
                }}
              >
                Progress
              </Button>
              <Button
                variant="subtle"
                color="gray"
                onClick={() => {
                  notify.clean();
                  clearInbox();
                }}
              >
                Clear all
              </Button>
            </Group>
          </Section>

          <Section title="Errors">
            <Group gap="xs">
              <MutationErrorButton />
              <Button
                variant="default"
                renderRoot={(p) => <Link to="/dashboards/$id" params={{ id: 'broken' }} {...p} />}
              >
                Route error
              </Button>
              <Button
                variant="default"
                renderRoot={(p) => <Link to="/dashboards/$id" params={{ id: 'missing' }} {...p} />}
              >
                Dashboard not found
              </Button>
              <Anchor component={Link} to="/this/does/not/exist" size="sm" px="sm">
                Unknown URL (404)
              </Anchor>
            </Group>
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" mt="md">
              <Paper variant="widget" h={200}>
                <ThrowingWidget />
              </Paper>
              <Paper variant="widget" h={200}>
                <ErrorState.Inline
                  title="Data source error"
                  description="Haystack server returned 502."
                  actions={
                    <Button size="xs" variant="default">
                      Retry
                    </Button>
                  }
                />
              </Paper>
            </SimpleGrid>
            <Paper variant="panel" mt="md" radius={0}>
              <ErrorState.Banner
                title="You're offline"
                description="Showing cached data. Changes sync when the connection is back."
              />
            </Paper>
          </Section>

          <Section title="Skeletons">
            <SimpleGrid cols={{ base: 1, md: 2, xl: 4 }} spacing="md">
              <Paper variant="panel" p="md" h={180}>
                <TextSkeleton />
              </Paper>
              <Paper variant="panel" p="md" h={180}>
                <ChartSkeleton />
              </Paper>
              <Paper variant="panel" p="md" h={180}>
                <TableSkeleton rows={4} columns={3} />
              </Paper>
              <Paper variant="panel" h={180}>
                <PanelSkeleton />
              </Paper>
            </SimpleGrid>
            <Paper variant="panel" mt="md">
              <DashboardSkeleton />
            </Paper>
          </Section>
        </Stack>
      </Page.Body>
    </Page.Root>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap="sm">
      <Title order={3}>{title}</Title>
      {children}
    </Stack>
  );
}

function MutationErrorButton() {
  const mutation = useMutation({
    mutationFn: async () => {
      await wait(600);
      throw new AppError('network', 'Could not reach the server. Check your connection.');
    },
    meta: { errorTitle: 'Save failed', source: 'Dashboard editor' },
  });
  return (
    <Button variant="default" loading={mutation.isPending} onClick={() => mutation.mutate()}>
      Mutation error (global handler)
    </Button>
  );
}

function ThrowingWidget() {
  const [broken, setBroken] = useState(false);
  return (
    <Stack h="100%" p="md" gap="xs">
      <Switch
        label="Break this widget"
        checked={broken}
        onChange={(e) => setBroken(e.currentTarget.checked)}
      />
      <WidgetBoundary name="Demo widget" key={String(broken)}>
        {broken ? (
          <Boom />
        ) : (
          <Text size="sm" c="dimmed">
            Working. Toggle to throw during render.
          </Text>
        )}
      </WidgetBoundary>
    </Stack>
  );
}

function Boom(): never {
  throw new AppError('datasource', 'Query "site.energy" returned an unexpected shape.');
}
