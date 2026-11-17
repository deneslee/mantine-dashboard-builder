import { Button, Text, TextInput } from '@mantine/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';
import { IconInfoCircle, IconListDetails } from '@tabler/icons-react';
import { createContext, use, useState } from 'react';
import { nav } from '@/app/nav';
import { TestRouter } from '@/testing/TestRouter';
import { Page } from '@/ui/components/Page';
import { Shell } from '../Shell';
import { ShellProvider } from '../ShellProvider';
import { createShellStore, type ShellInit } from '../createShellStore';
import type { ContextTab } from '../ContextTab';
import { useShellActions } from '../useShell';
import { ContextBarPanel } from './ContextBarPanel';

const detailsTab: ContextTab = {
  id: 'details',
  label: 'Details',
  icon: IconInfoCircle,
  component: () => (
    <Text p="md" size="sm">
      Route-specific context content.
    </Text>
  ),
};

const PageNameContext = createContext('none');

function PageName() {
  return <Text size="sm">Page: {use(PageNameContext)}</Text>;
}

function SelectionPage() {
  const [count, setCount] = useState(0);
  const { openContextBar } = useShellActions();
  // The panel never opens the bar by itself: the page does, when the user acts.
  const handleSelect = () => {
    setCount((c) => c + 1);
    openContextBar('selection');
  };
  return (
    <PageNameContext value="Sales overview">
      <Page.Root>
        <Page.Body>
          <Button onClick={handleSelect}>Select next</Button>
          <ContextBarPanel id="selection" label="Selection" icon={IconListDetails}>
            <Text p="md" size="sm">
              Selected: {count}
            </Text>
            <PageName />
            <TextInput label="Note" />
          </ContextBarPanel>
        </Page.Body>
      </Page.Root>
    </PageNameContext>
  );
}

function PanelStory({ state }: { state: ShellInit }) {
  const [store] = useState(() => createShellStore(state, false));
  return (
    <TestRouter
      contextTabs={[detailsTab]}
      page={<SelectionPage />}
      wrap={(outlet) => (
        <ShellProvider store={store} nav={nav} globalTabs={[]}>
          <Shell>{outlet}</Shell>
        </ShellProvider>
      )}
    />
  );
}

const meta = {
  component: PanelStory,
  parameters: { a11y: { test: 'todo' } },
} satisfies Meta<typeof PanelStory>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The page renders a panel into the bar; the bar follows the page's state and keeps its own across tabs and closing. */
export const Default: Story = {
  args: {
    state: {
      sidebar: { mode: 'expanded', isDocked: true },
      contextBar: { isOpen: true, isDocked: true, activeTab: 'details' },
    },
  },
  play: async ({ canvas, userEvent }) => {
    const bar = within(await canvas.findByRole('complementary', { name: 'Context' }));
    await expect(await bar.findByRole('tab', { name: 'Details' })).toBeInTheDocument();
    const select = await canvas.findByRole('button', { name: 'Select next' });

    await userEvent.click(select);
    await expect(await bar.findByText('Selected: 1')).toBeVisible();
    await expect(bar.getByText('Page: Sales overview')).toBeVisible();

    await userEvent.click(select);
    await expect(await bar.findByText('Selected: 2')).toBeVisible();

    await userEvent.type(bar.getByLabelText('Note'), 'draft');

    await userEvent.click(bar.getByRole('tab', { name: 'Details' }));
    await expect(await bar.findByText('Route-specific context content.')).toBeVisible();

    await userEvent.click(bar.getByRole('tab', { name: 'Selection' }));
    await expect(bar.getByLabelText('Note')).toHaveValue('draft');
    await expect(bar.getByText('Selected: 2')).toBeVisible();

    await userEvent.click(bar.getByRole('button', { name: 'Close context panel' }));
    // The content is inert while the panes slide.
    await waitFor(() => userEvent.click(select));
    const reopened = within(await canvas.findByRole('complementary', { name: 'Context' }));
    await waitFor(() => expect(reopened.getByText('Selected: 3')).toBeVisible());
    await expect(reopened.getByLabelText('Note')).toHaveValue('draft');
  },
};

export const Drawer: Story = {
  args: {
    state: {
      sidebar: { mode: 'expanded', isDocked: true },
      contextBar: { isOpen: false, isDocked: false, activeTab: 'details' },
    },
  },
  play: async ({ canvas, userEvent }) => {
    const body = within(document.body);
    const select = await canvas.findByRole('button', { name: 'Select next' });

    await userEvent.click(select);
    const dialog = within(await body.findByRole('dialog', { name: 'Context panel' }));
    await waitFor(() => expect(dialog.getByText('Selected: 1')).toBeVisible());

    await userEvent.keyboard('{Escape}');
    await waitFor(() => userEvent.click(select));
    const reopened = within(await body.findByRole('dialog', { name: 'Context panel' }));
    await waitFor(() => expect(reopened.getByText('Selected: 2')).toBeVisible());
  },
};
