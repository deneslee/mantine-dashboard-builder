import { EmptyState } from '@mantine/core';
import { IconHammer } from '@tabler/icons-react';
import { Page } from '@/design-system/components/Page/Page';

/** Temporary page for areas not built yet. Files prefixed with `-` are ignored by the router. */
export function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <Page.Root>
      <Page.Header title={title} />
      <Page.Body>
        <EmptyState
          mt="xl"
          variant="light"
          color="gray"
          icon={<IconHammer size={22} stroke={1.75} />}
          title="Not built yet"
          description={description}
        />
      </Page.Body>
    </Page.Root>
  );
}
