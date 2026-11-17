import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { StorageStory, type StoryPlace } from '@/testing/StorageStory';
import { StoragePage } from './StoragePage';

/** `/storage`: the places, each with its live status. The stories use fake places, so no deployment is needed. */
const meta = {
  component: StoragePage,
  beforeEach: () => localStorage.clear(),
} satisfies Meta<typeof StoragePage>;
export default meta;
type Story = StoryObj<typeof meta>;

const page = within(document.body);
const WAIT = { timeout: 5000 };

const browser: StoryPlace = {
  id: 'browser',
  name: 'This browser',
  description: 'Saves in this browser only.',
  status: { state: 'ready', message: 'Saving in this browser works.' },
};
const convex = (status: StoryPlace['status']): StoryPlace => ({
  id: 'convex',
  name: 'Convex',
  description: 'Shared across browsers and devices.',
  status,
});

export const Default: Story = {
  render: (args) => (
    <StorageStory places={[browser, convex({ state: 'ready', message: 'Connected.' })]}>
      <StoragePage {...args} />
    </StorageStory>
  ),
  play: async () => {
    await expect(await page.findAllByText('Ready', {}, WAIT)).toHaveLength(2);
    // The column heading and the badge on the browser's row.
    await expect(page.getAllByText('In use')).toHaveLength(2);
  },
};

/** A deployment that answers but has no record functions. */
export const ConvexNotDeployed: Story = {
  render: (args) => (
    <StorageStory places={[browser, convex({ state: 'notDeployed', message: 'Run `npx convex dev`.' })]}>
      <StoragePage {...args} />
    </StorageStory>
  ),
  play: async () => {
    await expect(await page.findByText('Functions not deployed', {}, WAIT)).toBeVisible();
  },
};

/** The build names no deployment: a dimmed row says how to add one. */
export const ConvexNotConfigured: Story = {
  args: {
    unavailable: [
      {
        id: 'convex',
        name: 'Convex',
        message: 'Not configured: set VITE_CONVEX_URL in .env.local and restart the dev server.',
      },
    ],
  },
  render: (args) => (
    <StorageStory places={[browser]}>
      <StoragePage {...args} />
    </StorageStory>
  ),
  play: async () => {
    await expect(await page.findByText(/set VITE_CONVEX_URL/, {}, WAIT)).toBeVisible();
  },
};

/** The setting names Convex but this build has none: the browser is used, and the page says so. */
export const SettingNamesAMissingPlace: Story = {
  args: { unavailable: [{ id: 'convex', name: 'Convex', message: 'Not configured.' }] },
  render: (args) => (
    <StorageStory places={[browser]} stored="convex">
      <StoragePage {...args} />
    </StorageStory>
  ),
  play: async () => {
    await expect(
      await page.findByText('Convex is not in this build; using This browser.', {}, WAIT),
    ).toBeVisible();
  },
};
