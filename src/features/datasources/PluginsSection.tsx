import { Badge, Button, Card, Group, SimpleGrid, Stack, Text, VisuallyHidden } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useState } from 'react';
import { toAppError } from '@/core/errors/AppError';
import { notify } from '@/lib/notify/notify';
import type { PluginCatalogEntry } from '@/plugins/OptionalPlugin';
import { usePlugins } from '@/plugins/usePlugins';
import { Section, SectionBody } from '@/ui/components/Section';
import { fontWeight } from '@/ui/tokens/semantic';
import { AddToBuildDialog } from './buildList/AddToBuildDialog';
import { writeDevBuildList } from './buildList/devBuildList';
import { useConnections } from './connections/useConnections';

/** Where a new list goes: the dev server's plugins.json, or a commit to the site's repository. */
type BuildListTarget = 'dev-server' | 'github';

const DEFAULT_TARGET: BuildListTarget = import.meta.env.DEV ? 'dev-server' : 'github';

const DESCRIPTIONS: Record<BuildListTarget, string> = {
  'dev-server':
    'Add to build edits plugins.json and reloads; commit it to deploy. A plugin not in the build has no code in it.',
  github:
    'Add to build commits plugins.json to the site’s repository with your GitHub token, and the site builds again. A plugin not in the build has no code in it.',
};

/**
 * The optional plugins: which are in this build, and Add to build or Remove for each. The dev server
 * writes `plugins.json` and reloads; the live site commits it to GitHub and waits for the new build.
 */
export function PluginsSection({
  target = DEFAULT_TARGET,
  writeBuildList = writeDevBuildList,
}: {
  target?: BuildListTarget;
  /** How the dev server takes it. */
  writeBuildList?: (plugins: string[]) => Promise<void>;
}) {
  const { catalog } = usePlugins().build;
  const connections = useConnections();
  const [pending, setPending] = useState<string>();
  // Kept after closing, so the dialog keeps its title while it fades out.
  const [dialog, setDialog] = useState<{ entry: PluginCatalogEntry; isOpen: boolean }>();
  const inBuild = catalog.filter((entry) => entry.isInBuild).map((entry) => entry.id);

  const change = async (entry: PluginCatalogEntry) => {
    if (target === 'github') return setDialog({ entry, isOpen: true });
    setPending(entry.id);
    try {
      await writeBuildList(
        entry.isInBuild ? inBuild.filter((id) => id !== entry.id) : [...inBuild, entry.id],
      );
    } catch (error) {
      notify.error({
        title: entry.isInBuild ? `${entry.name} was not removed` : `${entry.name} was not added`,
        message: toAppError(error).message,
      });
    }
    setPending(undefined);
  };

  const handleChange = (entry: PluginCatalogEntry) => {
    const users = connections.filter((connection) => connection.plugin === entry.id).length;
    if (!entry.isInBuild || users === 0) return void change(entry);
    modals.openConfirmModal({
      title: `Remove ${entry.name} from the build?`,
      children: (
        <Text size="sm">
          {users === 1 ? '1 connection uses it' : `${users} connections use it`}. They stay saved, but their
          widgets show an error until {entry.name} is back in the build.
        </Text>
      ),
      labels: { confirm: 'Remove from build', cancel: 'Keep it' },
      confirmProps: { color: 'danger' },
      onConfirm: () => void change(entry),
    });
  };

  return (
    <Section title="Plugins" description={DESCRIPTIONS[target]}>
      <SectionBody>
        <SimpleGrid type="container" cols={{ base: 1, '36rem': 2, '72rem': 4 }} spacing="md">
          {catalog.map((entry) => (
            <Card key={entry.id} withBorder padding="md">
              <Stack gap="sm" justify="space-between" h="100%">
                <Stack gap="xs">
                  <Group justify="space-between" gap="xs">
                    <Text fw={fontWeight.medium}>{entry.name}</Text>
                    <Badge variant="light" color={entry.isInBuild ? 'success' : 'neutral'}>
                      {entry.isInBuild ? 'In this build' : 'Not in this build'}
                    </Badge>
                  </Group>
                  <Text size="sm" c="dimmed">
                    {entry.description}
                  </Text>
                </Stack>
                <Button
                  variant={entry.isInBuild ? 'default' : 'filled'}
                  loading={pending === entry.id}
                  disabled={pending !== undefined && pending !== entry.id}
                  onClick={() => handleChange(entry)}
                >
                  {entry.isInBuild ? 'Remove from build' : 'Add to build'}
                  {/* Every card has this button: its name says which plugin it changes. */}
                  <VisuallyHidden> ({entry.name})</VisuallyHidden>
                </Button>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </SectionBody>
      {dialog ? (
        <AddToBuildDialog
          key={dialog.entry.id}
          entry={dialog.entry}
          opened={dialog.isOpen}
          onClose={() => setDialog({ ...dialog, isOpen: false })}
        />
      ) : null}
    </Section>
  );
}
