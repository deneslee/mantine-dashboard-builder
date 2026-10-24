import { Button, EmptyState } from '@mantine/core';
import { IconDatabaseOff } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import { usePlugins } from '@/plugins/usePlugins';
import { RouteBreadcrumbs } from '@/shell/breadcrumbs/RouteBreadcrumbs';
import { Page } from '@/ui/components/Page';
import { iconSize, iconStroke } from '@/ui/tokens/semantic';
import { ConnectionForm } from './ConnectionForm';
import { useConnection } from './connections/useConnections';

/** `/datasources/new?type=…` for a new connection, `/datasources/$id` for a saved one. */
export function ConnectionPage({ id, type: typeName }: { id?: string; type?: string }) {
  const { types } = usePlugins();
  const connection = useConnection(id ?? '');
  const type = types[connection?.type ?? typeName ?? ''];
  const title = connection?.name ?? (type ? `New ${type.name} connection` : 'New connection');
  return (
    <Page.Root>
      <Page.Header>
        <RouteBreadcrumbs />
        <Page.Title>{title}</Page.Title>
        {type ? <Page.Description>{type.description}</Page.Description> : null}
      </Page.Header>
      <Page.Body>
        {id && !connection ? (
          <Missing title="No such connection" description={`Nothing here has the id “${id}”.`} />
        ) : !type ? (
          <Missing
            title="Its plugin isn't in this build"
            description="Add the plugin to the build under Data sources, then come back."
          />
        ) : (
          <ConnectionForm key={connection?.updatedAt ?? 'new'} type={type} connection={connection} />
        )}
      </Page.Body>
    </Page.Root>
  );
}

function Missing({ title, description }: { title: string; description: string }) {
  return (
    <EmptyState
      mt="xl"
      variant="light"
      color="neutral"
      icon={<IconDatabaseOff size={iconSize.lg} stroke={iconStroke} />}
      title={title}
      description={description}
    >
      <EmptyState.Actions>
        <Button variant="default" renderRoot={(props) => <Link to="/datasources" {...props} />}>
          Back to Data sources
        </Button>
      </EmptyState.Actions>
    </EmptyState>
  );
}
