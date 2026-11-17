import type { Meta, StoryObj } from '@storybook/react-vite';
import { StorageForm } from './StorageForm';

const meta = { component: StorageForm } satisfies Meta<typeof StorageForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
