import { Alert, Anchor, Badge, Stack, Table, Text } from '@mantine/core';
import { Link } from '@tanstack/react-router';
import { getActiveRecordProviderId, useActivePlace } from '@/lib/records/activeRecordProvider';
import { usePlugins } from '@/plugins/usePlugins';
import { RouteBreadcrumbs } from '@/shell/breadcrumbs/RouteBreadcrumbs';
import { Page } from '@/ui/components/Page';
import { Section } from '@/ui/components/Section';
import { fontWeight } from '@/ui/tokens/semantic';
import { STORAGE_STATUS, useRecordProviderStatus } from './useRecordProviderStatus';

/** A place this build lacks, with why: shown dimmed, so the user knows it exists. */
export interface UnavailablePlace {
  id: string;
  name: string;
  message: string;
}

/** A place's state as a badge; the page of the place has the message. */
export function PlaceStatusBadge({ id }: { id: string }) {
  const status = STORAGE_STATUS[useRecordProviderStatus(id).state];
  return (
    <Badge variant="light" color={status.color}>
      {status.label}
    </Badge>
  );
}

/** `/storage`: the places records can be saved in, each with its live status. */
export function StoragePage({ unavailable = [] }: { unavailable?: UnavailablePlace[] }) {
  const { recordProviders } = usePlugins();
  const active = useActivePlace();
  const requested = getActiveRecordProviderId();
  const requestedName = unavailable.find((place) => place.id === requested)?.name ?? requested;
  return (
    <Page.Root>
      <Page.Header>
        <RouteBreadcrumbs />
        <Page.Title>Storage</Page.Title>
        <Page.Description>
          Where dashboards and records are saved. Switching does not move data.
        </Page.Description>
      </Page.Header>
      <Page.Body>
        <Stack gap="lg">
          {active.isFallback && (
            <Alert color="warning" title="Storage setting not available">
              {`${requestedName} is not in this build; using ${active.name}.`}
            </Alert>
          )}
          <Section title="Places">
            <Table.ScrollContainer minWidth={560}>
              <Table verticalSpacing="sm" horizontalSpacing="lg">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Place</Table.Th>
                    <Table.Th>About</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>In use</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {Object.values(recordProviders).map((place) => (
                    <Table.Tr key={place.id}>
                      <Table.Td>
                        <Anchor
                          fw={fontWeight.medium}
                          renderRoot={(props) => (
                            <Link to="/storage/$id" params={{ id: place.id }} {...props} />
                          )}
                        >
                          {place.name}
                        </Anchor>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {place.description}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <PlaceStatusBadge id={place.id} />
                      </Table.Td>
                      <Table.Td>
                        {active.id === place.id && (
                          <Badge variant="filled" color="brand">
                            In use
                          </Badge>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  {unavailable.map((place) => (
                    <Table.Tr key={place.id} opacity={0.6}>
                      <Table.Td>
                        <Text fw={fontWeight.medium}>{place.name}</Text>
                      </Table.Td>
                      <Table.Td colSpan={3}>
                        <Text size="sm" c="dimmed">
                          {`${place.name} · ${place.message}`}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Section>
        </Stack>
      </Page.Body>
    </Page.Root>
  );
}
