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

/** Remove from build writes the list without it. */
export const RemoveFromBuild: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Remove from build' }));
    await expect(args.writeBuildList).toHaveBeenCalledWith([]);
  },
};
