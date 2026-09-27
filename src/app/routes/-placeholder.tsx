import { EmptyState } from '@mantine/core';
import { IconHammer } from '@tabler/icons-react';
import { Page } from '@/design-system/components/Page/Page';
import { iconSize, iconStroke } from '@/design-system/tokens/semantic';

/** Temporary page for areas not built yet. Files prefixed with `-` are ignored by the router. */
export function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <Page.Root>
      <Page.Header title={title} />
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
