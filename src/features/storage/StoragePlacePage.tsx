import {
  Alert,
  Badge,
  Button,
  EmptyState,
  FileButton,
  Group,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import {
  IconAlertTriangle,
  IconCheck,
  IconDatabaseOff,
  IconLoader2,
  IconPlugConnectedX,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import type { ComponentType } from 'react';
import { toAppError } from '@/core/errors/AppError';
import type { CollectionExport } from '@/core/records/RecordProvider';
import { setActiveRecordProviderId, useActivePlace } from '@/lib/records/activeRecordProvider';
import { notify } from '@/lib/notify/notify';
import { usePlugins } from '@/plugins/usePlugins';
import { RouteBreadcrumbs } from '@/shell/breadcrumbs/RouteBreadcrumbs';
import { Page } from '@/ui/components/Page';
import { Section, SectionBody } from '@/ui/components/Section';
import { fontWeight, iconSize, iconStroke } from '@/ui/tokens/semantic';
import { countLabel, type StorageCollection } from './collections';
import { PlaceStatusBadge } from './StoragePage';
import { collectionCountQuery, useCollectionCount } from './useCollectionCount';
import { useCollectionTransfer } from './useCollectionTransfer';
import { useRecordProviderStatus, type StatusState } from './useRecordProviderStatus';

const STATUS_ICON: Record<
  StatusState,
  { icon: ComponentType<{ size?: number; stroke?: number }>; color: string }
> = {
  checking: { icon: IconLoader2, color: 'neutral' },
  ready: { icon: IconCheck, color: 'success' },
  unreachable: { icon: IconPlugConnectedX, color: 'danger' },
  notDeployed: { icon: IconDatabaseOff, color: 'danger' },
  failed: { icon: IconAlertTriangle, color: 'danger' },
};

/** `/storage/$id`: one place: its status, "Use for saving", and its collections to export, import and copy. */
export function StoragePlacePage({
  id,
  collections,
  writeNoticeMs,
}: {
  id: string;
  collections: StorageCollection[];
  /** How long a write may be out before the page says it is waiting. Stories shorten it. */
  writeNoticeMs?: number;
}) {
  const { recordProviders } = usePlugins();
  if (!Object.hasOwn(recordProviders, id))
    return (
      <Page.Root>
        <Page.Header>
          <RouteBreadcrumbs />
          <Page.Title>Storage</Page.Title>
        </Page.Header>
        <Page.Body>
          <EmptyState
            variant="light"
            color="neutral"
            icon={<IconDatabaseOff size={iconSize.lg} stroke={iconStroke} />}
            title="This place is not in this build"
            description={`"${id}" is not one of the places this build can save in.`}
          />
        </Page.Body>
      </Page.Root>
    );
  return <PlaceDetails id={id} collections={collections} writeNoticeMs={writeNoticeMs} />;
}

function PlaceDetails({
  id,
  collections,
  writeNoticeMs,
}: {
  id: string;
  collections: StorageCollection[];
  writeNoticeMs?: number;
}) {
  const { recordProviders } = usePlugins();
  const place = recordProviders[id]!;
  const active = useActivePlace();
  const status = useRecordProviderStatus(id);
  const transfer = useCollectionTransfer({ noticeMs: writeNoticeMs });
  const isActive = active.id === id;
  const isReady = status.state === 'ready';
  const { icon: StatusIcon, color } = STATUS_ICON[status.state];

  const confirmUse = () => {
    const unsaved = collections.flatMap((collection) => {
      const count = collection.countUnsaved?.(active.id) ?? 0;
      return count > 0
        ? [
            `${countLabel(collection, count)} ${count === 1 ? 'has' : 'have'} unsaved edits; ${count === 1 ? 'it stays' : 'they stay'} with ${active.name}.`,
          ]
        : [];
    });
    modals.openConfirmModal({
      title: `Save in ${place.name}?`,
      children: (
        <Text size="sm">
          {[`${collections.map((c) => c.label).join(', ')} in ${active.name} stay there.`, ...unsaved].join(
            ' ',
          )}
        </Text>
      ),
      labels: { confirm: 'Use for saving', cancel: 'Cancel' },
      onConfirm: () => {
        const result = setActiveRecordProviderId(id);
        if (result.ok) notify.success({ title: `Now saving in ${place.name}` });
        else notify.error({ title: `Could not change the setting: ${result.message}` });
      },
    });
  };

  return (
    <Page.Root>
      <Page.Header>
        <RouteBreadcrumbs />
        <Page.Title>{place.name}</Page.Title>
        <Page.Description>{[place.description, place.note].filter(Boolean).join(' ')}</Page.Description>
        <Page.Actions>
          <Button variant="default" onClick={status.check} loading={status.state === 'checking'}>
            Check again
          </Button>
          {isActive ? (
            <Badge size="lg" variant="filled" color="brand">
              In use
            </Badge>
          ) : (
            <Tooltip label="Available once the status is Ready." disabled={isReady}>
              <span>
                <Button onClick={confirmUse} disabled={!isReady}>
                  Use for saving
                </Button>
              </span>
            </Tooltip>
          )}
        </Page.Actions>
      </Page.Header>
      <Page.Body>
        <Stack gap="lg">
          <Alert
            color={color}
            variant="light"
            icon={<StatusIcon size={iconSize.md} stroke={iconStroke} />}
            title="Status"
            role="status"
          >
            <Stack gap="3xs">
              <PlaceStatusBadge id={id} />
              {status.message && <Text size="sm">{status.message}</Text>}
            </Stack>
          </Alert>
          <Section title="Collections">
            <Table.ScrollContainer minWidth={640}>
              <Table verticalSpacing="sm" horizontalSpacing="lg">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Collection</Table.Th>
                    <Table.Th>Saved</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {collections.map((collection) => (
                    <CollectionRow
                      key={collection.id}
                      placeId={id}
                      placeName={place.name}
                      collection={collection}
                      isReady={isReady}
                      transfer={transfer}
                    />
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            {!isReady && (
              <SectionBody>
                <Text size="sm" c="dimmed">
                  Counts and transfers are available once the status is Ready.
                </Text>
              </SectionBody>
            )}
          </Section>
        </Stack>
      </Page.Body>
    </Page.Root>
  );
}

function CollectionRow({
  placeId,
  placeName,
  collection,
  isReady,
  transfer,
}: {
  placeId: string;
  placeName: string;
  collection: StorageCollection;
  isReady: boolean;
  transfer: ReturnType<typeof useCollectionTransfer>;
}) {
  const { recordProviders } = usePlugins();
  const queryClient = useQueryClient();
  const count = useCollectionCount(placeId, collection.id, isReady);
  const others = Object.values(recordProviders).filter((other) => other.id !== placeId);
  const isBusy = transfer.active !== null;
  const isWaitingHere =
    transfer.active?.isWaiting === true &&
    transfer.active.placeId === placeId &&
    transfer.active.collection === collection.id;

  /** A count asked fresh, for a confirmation that names it. */
  const countOf = (id: string) =>
    queryClient.fetchQuery({ ...collectionCountQuery(id, collection.id), staleTime: 0 });

  const confirmReplace = async (source: string, then: () => void) => {
    let here: number;
    try {
      here = await countOf(placeId);
    } catch (error) {
      notify.error({ title: 'Could not read the place', message: toAppError(error).message });
      return;
    }
    modals.openConfirmModal({
      title: `Replace the ${countLabel(collection, here)} in ${placeName} with ${source}?`,
      children: <Text size="sm">It cannot be undone.</Text>,
      labels: { confirm: 'Replace', cancel: 'Cancel' },
      confirmProps: { color: 'danger' },
      onConfirm: then,
    });
  };

  const handleImport = async (file: File | null) => {
    if (!file) return;
    const data: CollectionExport | undefined = await transfer.prepareImport(file, collection);
    if (data)
      await confirmReplace(
        `the ${data.records.length} in the file`,
        () => void transfer.importData(placeId, collection, data),
      );
  };

  const handleCopy = async (source: { id: string; name: string }) => {
    let there: number;
    try {
      there = await countOf(source.id);
    } catch (error) {
      notify.error({ title: `Could not read ${source.name}`, message: toAppError(error).message });
      return;
    }
    // Both places are fixed here, at the confirmation: the place in use may change before it is confirmed.
    await confirmReplace(
      `the ${there} from ${source.name}`,
      () => void transfer.copy(source.id, { id: placeId, name: placeName }, collection),
    );
  };

  return (
    <Table.Tr>
      <Table.Td>
        <Text fw={fontWeight.medium}>{collection.label}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {count.data === undefined ? '—' : `${count.data} saved`}
        </Text>
      </Table.Td>
      <Table.Td>
        {isWaitingHere ? (
          <Text size="sm">{`Waiting for ${placeName} to confirm…`}</Text>
        ) : (
          <Group gap="xs">
            <Button
              size="xs"
              variant="default"
              disabled={!isReady || isBusy}
              onClick={() => void transfer.exportCollection(placeId, collection)}
            >
              Export
            </Button>
            <FileButton accept="application/json,.json" onChange={(file) => void handleImport(file)}>
              {(props) => (
                <Button size="xs" variant="default" disabled={!isReady || isBusy} {...props}>
                  Import…
                </Button>
              )}
            </FileButton>
            {others.map((other) => (
              <Button
                key={other.id}
                size="xs"
                variant="default"
                disabled={!isReady || isBusy}
                onClick={() => void handleCopy(other)}
              >
                {`Copy from ${other.name}…`}
              </Button>
            ))}
          </Group>
        )}
      </Table.Td>
    </Table.Tr>
  );
}
