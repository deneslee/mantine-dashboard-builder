import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, spyOn, userEvent, waitFor, within } from 'storybook/test';
import { VAULT_STORAGE_KEY, createVaultStore } from '@/lib/vault/createVaultStore';
import { connectionFingerprint, connectionVaultKey } from '@/plugins/connectionDatasource';
import type { Connection } from '@/plugins/OptionalPlugin';
import { AppStory } from '@/testing/AppStory';
import { CONNECTIONS_STORAGE_KEY } from './connections/createConnectionsStore';

/**
 * The Data sources pages in the real app. Stories have every optional plugin in the build
 * (plugins.config.ts); the play functions are the flows: create a connection, test it, save its
 * secrets on this device, unlock them after a reload.
 */
const meta = {
  component: AppStory,
  beforeEach: () => localStorage.clear(),
} satisfies Meta<typeof AppStory>;
export default meta;
type Story = StoryObj<typeof meta>;

// Mantine renders menus and dialogs in portals, outside the story root.
const page = within(document.body);
const WAIT = { timeout: 5000 };
const TOKEN = 'ya29.story-token-never-stored';
const PASSPHRASE = 'correct horse battery staple';

const analytics: Connection = {
  id: 'analytics',
  plugin: 'google',
  type: 'bigquery',
  name: 'Analytics',
  settings: { projectId: 'my-dashboards-123', location: 'EU', maximumBytesBilled: '' },
  updatedAt: '2026-10-24T08:00:00.000Z',
};

const seedConnections = (connections: Connection[]) =>
  localStorage.setItem(CONNECTIONS_STORAGE_KEY, JSON.stringify({ state: { connections }, version: 1 }));

/** A vault saved with fewer iterations, so unlocking is quick in the story. */
async function seedVault(connection: Connection) {
  const vault = createVaultStore({ iterations: 1_000 });
  await vault.getState().actions.create(PASSPHRASE);
  await vault.getState().actions.set(connectionVaultKey(connection.id), {
    secrets: { accessToken: TOKEN },
    fingerprint: connectionFingerprint(connection),
    isSaved: true,
  });
}

async function fillBigQuery(name: string) {
  await userEvent.type(await page.findByRole('textbox', { name: 'Name' }, WAIT), name);
  await userEvent.type(page.getByRole('textbox', { name: 'Project id' }), 'my-dashboards-123');
  await userEvent.type(page.getByLabelText('Access token'), TOKEN);
}

export const Empty: Story = { args: { url: '/datasources' } };

export const WithConnections: Story = {
  args: { url: '/datasources' },
  beforeEach: () =>
    seedConnections([
      analytics,
      { ...analytics, id: 'warehouse', name: 'Warehouse', plugin: 'gone', type: 'gone-sql' },
    ]),
  play: async () => {
    await expect(await page.findByRole('link', { name: 'Analytics' }, WAIT)).toBeVisible();
    await expect(page.getByText('Needs secrets')).toBeVisible();
    await expect(page.getByText('Plugin not in this build')).toBeVisible();
  },
};

export const Locked: Story = {
  args: { url: '/datasources' },
  beforeEach: async () => {
    seedConnections([analytics]);
    await seedVault(analytics);
  },
  play: async () => {
    await expect(await page.findByText('Locked', {}, WAIT)).toBeVisible();
    await userEvent.click(page.getByRole('button', { name: 'Unlock saved secrets' }));
    await userEvent.type(await page.findByLabelText('Passphrase', {}, WAIT), PASSPHRASE);
    await userEvent.click(page.getByRole('button', { name: 'Unlock' }));
    await expect(await page.findByText('Ready', {}, WAIT)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lock saved secrets' })).toBeVisible();
  },
};

export const NewConnection: Story = { args: { url: '/datasources/new?type=bigquery' } };

/** Name, project and token, Save: the list shows it Ready, and the token isn't in storage. */
export const CreateConnection: Story = {
  args: { url: '/datasources/new?type=bigquery' },
  play: async () => {
    await fillBigQuery('Sales warehouse');
    await expect(page.getByRole('textbox', { name: 'Id' })).toHaveValue('sales-warehouse');
    await userEvent.click(page.getByRole('button', { name: 'Save' }));
    await expect(await page.findByRole('link', { name: 'Sales warehouse' }, WAIT)).toBeVisible();
    await expect(page.getByText('Ready')).toBeVisible();
    const stored = Object.keys(localStorage).map((key) => localStorage.getItem(key));
    await expect(JSON.stringify(stored)).not.toContain(TOKEN);
  },
};

/** Test connection with credentials Google refuses: the reason, inline. */
export const TestFailed: Story = {
  args: { url: '/datasources/new?type=bigquery' },
  beforeEach: () => {
    spyOn(window, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: 401, message: 'Request had invalid authentication credentials.' } }),
        {
          status: 401,
        },
      ),
    );
  },
  play: async () => {
    await fillBigQuery('Analytics');
    await userEvent.click(page.getByRole('button', { name: 'Test connection' }));
    await expect(await page.findByText('The test failed', {}, WAIT)).toBeVisible();
    await expect(page.getByText(/refused the credentials: Request had invalid authentication/)).toBeVisible();
  },
};

/** Save on this device asks for a passphrase once; what's stored is ciphertext. */
export const SaveOnDevice: Story = {
  args: { url: '/datasources/new?type=bigquery' },
  play: async () => {
    await fillBigQuery('Analytics');
    await userEvent.click(page.getByRole('checkbox', { name: 'Save on this device' }));
    await userEvent.click(page.getByRole('button', { name: 'Save' }));
    const dialog = within(await page.findByRole('dialog', { name: 'Save secrets on this device' }, WAIT));
    await userEvent.type(dialog.getByLabelText('Passphrase'), PASSPHRASE);
    await userEvent.type(dialog.getByLabelText('Repeat it'), PASSPHRASE);
    await userEvent.click(dialog.getByRole('button', { name: 'Save on this device' }));
    await expect(await page.findByRole('link', { name: 'Analytics' }, { timeout: 15_000 })).toBeVisible();
    await waitFor(() =>
      expect(localStorage.getItem(VAULT_STORAGE_KEY)).toContain('"keys":["connection:analytics"]'),
    );
    await expect(localStorage.getItem(VAULT_STORAGE_KEY)).not.toContain(TOKEN);
  },
};

/** A saved connection whose project was changed in storage: its secrets aren't used. */
export const ChangedOutsideTheApp: Story = {
  args: { url: '/datasources/analytics' },
  beforeEach: async () => {
    await seedVault(analytics);
    seedConnections([
      { ...analytics, settings: { ...analytics.settings, projectId: 'someone-elses-project' } },
    ]);
  },
  play: async () => {
    await userEvent.click(await page.findByRole('button', { name: 'Unlock saved secrets' }, WAIT));
    await userEvent.type(await page.findByLabelText('Passphrase', {}, WAIT), PASSPHRASE);
    await userEvent.click(page.getByRole('button', { name: 'Unlock' }));
    await expect(await page.findByText('Changed outside the app', {}, WAIT)).toBeVisible();
    await waitFor(() => expect(page.queryByRole('dialog')).toBeNull());
  },
};

export const NoSuchConnection: Story = { args: { url: '/datasources/nope' } };
