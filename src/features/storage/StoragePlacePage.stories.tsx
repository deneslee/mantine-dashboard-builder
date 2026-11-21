import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { StorageStory, storyCollections, type StoryPlace } from '@/testing/StorageStory';
import { StoragePlacePage } from './StoragePlacePage';

/** `/storage/convex`: one place. A fake Convex answers each status, so every state can be shown. */
const meta = {
  component: StoragePlacePage,
  args: { id: 'convex', collections: storyCollections },
  beforeEach: () => localStorage.clear(),
} satisfies Meta<typeof StoragePlacePage>;
export default meta;
type Story = StoryObj<typeof meta>;

// Mantine renders dialogs in portals, outside the story root.
const page = within(document.body);
const WAIT = { timeout: 5000 };

const browser: StoryPlace = {
  id: 'browser',
  name: 'This browser',
  description: 'Saves in this browser only.',
  status: { state: 'ready', message: 'Saving in this browser works.' },
  count: 5,
};
const convex = (status: StoryPlace['status'], extra: Partial<StoryPlace> = {}): StoryPlace => ({
  id: 'convex',
  name: 'Convex',
  description: 'Shared across browsers and devices.',
  note: 'No sign-in yet: anyone with the deployment URL can read and write.',
  status,
  count: 3,
  ...extra,
});

const withStatus = (status: StoryPlace['status'], extra?: Partial<StoryPlace>): Story => ({
  render: (args) => (
    <StorageStory places={[browser, convex(status, extra)]}>
      <StoragePlacePage {...args} />
    </StorageStory>
  ),
});

export const Default: Story = {
  ...withStatus({ state: 'ready', message: 'Connected to https://example.convex.cloud.' }),
  play: async () => {
    await expect(await page.findByText('3 saved', {}, WAIT)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use for saving' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Copy from This browser…' })).toBeEnabled();
  },
};

export const Checking: Story = {
  ...withStatus('checking'),
  play: async () => {
    await expect(await page.findAllByText('Checking…', {}, WAIT)).not.toHaveLength(0);
    await expect(page.getByRole('button', { name: 'Use for saving' })).toBeDisabled();
  },
};

export const Ready: Story = {
  ...withStatus({ state: 'ready', message: 'Connected to https://example.convex.cloud.' }),
  play: async () => {
    await expect(await page.findByText('Connected to https://example.convex.cloud.', {}, WAIT)).toBeVisible();
  },
};

export const Unreachable: Story = {
  ...withStatus({ state: 'unreachable', message: 'No answer from https://example.convex.cloud in 10 s.' }),
  play: async () => {
    await expect(await page.findByText(/No answer from/, {}, WAIT)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use for saving' })).toBeDisabled();
  },
};

export const NotDeployed: Story = {
  ...withStatus({
    state: 'notDeployed',
    message: 'https://example.convex.cloud answers, but has no record functions. Run `npx convex dev`.',
  }),
  play: async () => {
    await expect(await page.findByText(/has no record functions/, {}, WAIT)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use for saving' })).toBeDisabled();
  },
};

export const Failed: Story = {
  ...withStatus({ state: 'failed', message: 'Server Error' }),
  play: async () => {
    await expect(await page.findByText('Server Error', {}, WAIT)).toBeVisible();
  },
};

/** Use for saving asks first, and says what stays where it is. */
export const UseForSaving: Story = {
  ...withStatus({ state: 'ready', message: 'Connected.' }),
  play: async () => {
    await userEvent.click(await page.findByRole('button', { name: 'Use for saving' }, WAIT));
    await expect(await page.findByRole('dialog', { name: 'Save in Convex?' }, WAIT)).toBeInTheDocument();
    await expect(page.getByText(/in This browser stay there/)).toBeInTheDocument();
  },
};

/** A write that Convex has not confirmed: the row says so and its buttons wait. */
export const Waiting: Story = {
  args: { writeNoticeMs: 0 },
  render: (args) => (
    <StorageStory
      places={[
        browser,
        convex({ state: 'ready', message: 'Connected.' }, { heldImport: new Promise<void>(() => {}) }),
      ]}
    >
      <StoragePlacePage {...args} />
    </StorageStory>
  ),
  play: async () => {
    await userEvent.click(await page.findByRole('button', { name: 'Copy from This browser…' }, WAIT));
    await userEvent.click(await page.findByRole('button', { name: 'Replace' }, WAIT));
    await expect(await page.findByText('Waiting for Convex to confirm…', {}, WAIT)).toBeVisible();
    await expect(page.queryByRole('button', { name: 'Export' })).toBeNull();
  },
};

const setup = {
  label: 'Deployment URL',
  description: 'From the Convex dashboard.',
  placeholder: 'https://happy-animal-123.convex.cloud',
  validate: (value: string) => (value.startsWith('https://') ? null : 'Start the URL with https://.'),
  test: async () => 'Connected to https://example.convex.cloud.',
};

/** Convex has no URL yet: the status says so, and the form is where to fix it. */
export const NotSetUp: Story = {
  ...withStatus(
    { state: 'notConfigured', message: 'Enter the deployment URL below, test it, then save.' },
    { setup },
  ),
  play: async () => {
    await expect((await page.findAllByText('Not set up', {}, WAIT))[0]).toBeVisible();
    await userEvent.type(page.getByRole('textbox'), 'https://example.convex.cloud');
    await userEvent.click(page.getByRole('button', { name: 'Test connection' }));
    await expect(await page.findByText('Connected to https://example.convex.cloud.', {}, WAIT)).toBeVisible();
  },
};
