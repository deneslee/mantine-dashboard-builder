import { EmptyState } from '@mantine/core';
import { IconHammer } from '@tabler/icons-react';
import { RouteBreadcrumbs } from '@/shell/breadcrumbs/RouteBreadcrumbs';
import { Page } from '@/ui/components/Page';
import { iconSize, iconStroke } from '@/ui/tokens/semantic';

/** Temporary page for areas not built yet. Files prefixed with `-` are ignored by the router. */
export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <Page.Root>
      <Page.Header>
        <RouteBreadcrumbs />
        <Page.Title>{title}</Page.Title>
      </Page.Header>
      <Page.Body>
        <EmptyState
          mt="xl"
          variant="light"
          color="neutral"
          icon={<IconHammer size={iconSize.lg} stroke={iconStroke} />}
          title="Not built yet"
          description={description}
        />
      </Page.Body>
    </Page.Root>
  );
}
