import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { PluginsSection } from './PluginsSection';

/** The optional plugins as the dev server offers them. Stories have every plugin in the build. */
const meta = {
  component: PluginsSection,
  args: { writeBuildList: fn(async () => {}) },
} satisfies Meta<typeof PluginsSection>;
export default meta;
type Story = StoryObj<typeof meta>;

export const InTheBuild: Story = {};

/** Remove from build writes the list without that plugin, in the table's order. */
export const RemoveFromBuild: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Remove from build (Google Cloud)' }));
    await expect(args.writeBuildList).toHaveBeenCalledWith(['azure-sql', 'mongodb', 'aws']);
  },
};

/** On the live site, Add to build and Remove commit to GitHub, through a dialog. */
export const OnTheLiveSite: Story = {
  args: { target: 'github' },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Remove from build (AWS)' }));
    await expect(
      await within(canvasElement.ownerDocument.body).findByRole('dialog', {
        name: 'Remove AWS from the build',
      }),
    ).toBeInTheDocument();
    await expect(args.writeBuildList).not.toHaveBeenCalled();
  },
};
