import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { AppError } from '@/core/errors/AppError';
import { AddToBuildDialog } from './AddToBuildDialog';
import { BUILD_TARGET_KEY } from './buildTarget';

/** Add to build on the live site, with GitHub and the new build faked. */
const COMMIT = {
  sha: 'c0ffee1234567890',
  url: 'https://github.com/deneslee/mantine-dashboard-builder/commit/c0ffee1234567890',
};

const meta = {
  component: AddToBuildDialog,
  args: {
    entry: {
      id: 'aws',
      name: 'AWS',
      description: 'Athena, Aurora, Redshift and DynamoDB.',
      isInBuild: false,
    },
    opened: true,
    onClose: fn(),
    commit: fn(async () => ({ plugins: ['aws'], commit: COMMIT })),
    waitForLive: fn(async () => ({ plugins: ['aws'], commit: COMMIT.sha, builtAt: '2026-10-24T12:00:00Z' })),
  },
  // Each story starts without a repository remembered from another.
  beforeEach: () => localStorage.removeItem(BUILD_TARGET_KEY),
} satisfies Meta<typeof AddToBuildDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

/** The dialog renders in a portal, outside the story's root. */
const page = (canvasElement: HTMLElement) => within(canvasElement.ownerDocument.body);

async function fillAndCommit(canvasElement: HTMLElement) {
  const body = page(canvasElement);
  await userEvent.type(await body.findByLabelText('Repository'), 'deneslee/mantine-dashboard-builder');
  await userEvent.type(body.getByLabelText('GitHub token'), 'github_pat_example');
  await userEvent.click(body.getByRole('button', { name: 'Commit and build' }));
  return body;
}

export const Token: Story = {};

export const Incomplete: Story = {
  play: async ({ args, canvasElement }) => {
    const body = page(canvasElement);
    await userEvent.click(await body.findByRole('button', { name: 'Commit and build' }));
    await expect(body.getByText('Paste a token.')).toBeInTheDocument();
    await expect(body.getByText(/^owner\/name, e\.g\./)).toBeInTheDocument();
    await expect(args.commit).not.toHaveBeenCalled();
  },
};

export const Committing: Story = {
  args: { commit: fn(() => new Promise<never>(() => {})) },
  play: async ({ canvasElement }) => {
    const body = await fillAndCommit(canvasElement);
    await expect(await body.findByText(/^Committing plugins\.json/)).toBeInTheDocument();
  },
};

export const Waiting: Story = {
  args: { waitForLive: fn(() => new Promise<never>(() => {})) },
  play: async ({ args, canvasElement }) => {
    const body = await fillAndCommit(canvasElement);
    await expect(await body.findByText('Waiting for the new build…')).toBeInTheDocument();
    await expect(body.getByRole('link', { name: 'commit c0ffee1' })).toHaveAttribute('href', COMMIT.url);
    await expect(args.commit).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { repository: 'deneslee/mantine-dashboard-builder', branch: 'main' },
        token: 'github_pat_example',
        change: { id: 'aws', isAdded: true },
      }),
    );
  },
};

export const Live: Story = {
  play: async ({ canvasElement }) => {
    const body = await fillAndCommit(canvasElement);
    await expect(await body.findByText('The new build is live')).toBeInTheDocument();
    await expect(body.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  },
};

export const Failed: Story = {
  args: {
    commit: fn(async () => {
      throw new AppError(
        'forbidden',
        'GitHub refused: Resource not accessible by personal access token. The token needs Contents: read and write on deneslee/mantine-dashboard-builder.',
      );
    }),
  },
  play: async ({ canvasElement }) => {
    const body = await fillAndCommit(canvasElement);
    await expect(await body.findByText(/Resource not accessible/)).toBeInTheDocument();
    await expect(body.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  },
};
