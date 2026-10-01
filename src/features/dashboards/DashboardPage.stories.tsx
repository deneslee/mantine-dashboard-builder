import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, spyOn, userEvent, waitFor, within } from 'storybook/test';
import sales from '../../../public/data/dashboards/sales.json';
import { AppStory } from '@/testing/AppStory';
import { dashboardDoc } from '@/core/dashboard/dashboardSchema';
import { toDashboard } from './data/mapper';
import { writeDraft, writeSaved } from './data/drafts';

/**
 * The dashboard page in the real app (routes, loaders, plugins), at a URL. The play functions are the
 * edit flows users rely on; they run in Chromium through Storybook's Vitest addon.
 */
const meta = {
  component: AppStory,
  beforeEach: () => localStorage.clear(),
} satisfies Meta<typeof AppStory>;
export default meta;
type Story = StoryObj<typeof meta>;

// Mantine renders menus, drawers and dialogs in portals, outside the story root.
const page = within(document.body);
const WAIT = { timeout: 5000 };
const controls = () => within(page.getByRole('group', { name: 'Dashboard controls' }));
const salesDashboard = () => toDashboard(dashboardDoc.parse(sales));

async function chooseFromMenu(widget: string, item: string) {
  await userEvent.click(await page.findByRole('button', { name: `Actions for ${widget}` }, WAIT));
  await userEvent.click(await page.findByRole('menuitem', { name: item }, WAIT));
}

/** Edits the Revenue title in the widget drawer and leaves the field, which commits one undo step. */
async function renameRevenue(title: string) {
  await chooseFromMenu('Revenue', 'Edit');
  const field = await page.findByRole('textbox', { name: 'Title' }, WAIT);
  await userEvent.clear(field);
  await userEvent.type(field, title);
  await userEvent.tab();
  await expect(await page.findByText('Unsaved changes')).toBeVisible();
}

const EDIT = '/dashboards/sales?mode=edit';

export const View: Story = { args: { url: '/dashboards/sales' } };
export const Editing: Story = { args: { url: EDIT } };
export const WidgetOptions: Story = { args: { url: `${EDIT}&widget=revenue` } };
export const QueryEditor: Story = { args: { url: `${EDIT}&widget=revenue&editor=queries` } };

export const Empty: Story = {
  args: { url: EDIT },
  beforeEach: () => writeSaved({ ...salesDashboard(), widgets: {}, layouts: { lg: [] } }),
  play: async () => {
    await expect(await page.findByText('No widgets yet.', {}, WAIT)).toBeVisible();
  },
};

export const StorageError: Story = {
  args: { url: EDIT },
  beforeEach: () => {
    const setItem = localStorage.setItem.bind(localStorage);
    spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      if (key.startsWith('dashboard.draft')) throw new DOMException('Quota exceeded', 'QuotaExceededError');
      setItem(key, value);
    });
  },
  play: async () => {
    await renameRevenue('Edited revenue');
    await expect(await page.findByText(/The draft could not be stored/)).toBeVisible();
  },
};

export const RestoresDraft: Story = {
  args: { url: '/dashboards/sales' },
  beforeEach: () => {
    const saved = salesDashboard();
    const draft = structuredClone(saved);
    draft.widgets.revenue!.title = 'Draft revenue';
    writeDraft(saved, draft);
  },
  play: async () => {
    await expect(await page.findByText('Unsaved changes', {}, WAIT)).toBeVisible();
    await expect(page.getByRole('region', { name: 'Draft revenue' })).toBeInTheDocument();
  },
};

export const BlurCommitUndo: Story = {
  args: { url: EDIT },
  play: async () => {
    await renameRevenue('Edited revenue');
    await userEvent.click(controls().getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('Revenue'));
    await expect(page.getByText('Saved locally')).toBeVisible();
    await expect(controls().getByRole('button', { name: 'Undo' })).toBeDisabled();
  },
};

export const SaveThenUndo: Story = {
  args: { url: EDIT },
  play: async () => {
    await renameRevenue('Saved revenue');
    await userEvent.click(controls().getByRole('button', { name: 'Save' }));
    await expect(await page.findByText('Saved locally', {}, WAIT)).toBeVisible();
    await userEvent.click(controls().getByRole('button', { name: 'Undo' }));
    await expect(await page.findByText('Unsaved changes')).toBeVisible();
    await userEvent.click(controls().getByRole('button', { name: 'Redo' }));
    await expect(await page.findByText('Saved locally')).toBeVisible();
  },
};

export const Discard: Story = {
  args: { url: EDIT },
  play: async () => {
    await renameRevenue('Discarded revenue');
    await userEvent.click(controls().getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(page.getByRole('textbox', { name: 'Title' })).toHaveValue('Revenue'));
    await expect(controls().getByRole('button', { name: 'Undo' })).toBeDisabled();
  },
};

export const DuplicateRemoveAdd: Story = {
  args: { url: EDIT },
  play: async ({ canvasElement }) => {
    await page.findByRole('region', { name: 'Revenue' }, WAIT);
    const grid = within(canvasElement.querySelector<HTMLElement>('.react-grid-layout')!);
    const undo = () => userEvent.click(controls().getByRole('button', { name: 'Undo' }));

    await chooseFromMenu('Revenue', 'Duplicate');
    await grid.findByRole('region', { name: 'Revenue copy' }, WAIT);
    await undo();
    await waitFor(() => expect(grid.queryByRole('region', { name: 'Revenue copy' })).toBeNull());

    await chooseFromMenu('Revenue', 'Remove');
    await waitFor(() => expect(grid.queryByRole('region', { name: 'Revenue' })).toBeNull());
    await undo();
    await grid.findByRole('region', { name: 'Revenue' }, WAIT);

    await userEvent.click(controls().getByRole('button', { name: 'Add widget' }));
    const title = await page.findByRole('textbox', { name: 'Title' }, WAIT);
    // The drawer once rendered 0px tall, clipping the form it holds.
    const drawer = page.getByRole('dialog', { name: 'Add widget' });
    await expect(drawer.getBoundingClientRect().height).toBeGreaterThan(title.getBoundingClientRect().height);
    await userEvent.type(title, 'New widget');
    await userEvent.click(page.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(grid.getAllByRole('region').at(-1)).toHaveAccessibleName('New widget'));
  },
};

export const MoveResizeDialogs: Story = {
  args: { url: EDIT },
  play: async () => {
    const menuButton = () => page.getByRole('button', { name: 'Actions for Revenue' });

    await chooseFromMenu('Revenue', 'Resize…');
    const width = await page.findByRole('textbox', { name: 'Width (columns)' }, WAIT);
    await userEvent.clear(width);
    await userEvent.type(width, '7');
    await userEvent.click(page.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(document.activeElement).toBe(menuButton()));
    await expect(page.getByText(/^Resized Revenue from .* to .*7 by 6\.$/)).toBeInTheDocument();

    await chooseFromMenu('Revenue', 'Move to…');
    const column = await page.findByRole('textbox', { name: 'Column' }, WAIT);
    await userEvent.clear(column);
    await userEvent.type(column, '2');
    await userEvent.click(page.getByRole('button', { name: 'Apply' }));
    await waitFor(() => expect(document.activeElement).toBe(menuButton()));
    await expect(page.getByText(/^Moved Revenue from /)).toBeInTheDocument();

    await userEvent.click(controls().getByRole('button', { name: 'Undo' }));
    await userEvent.click(controls().getByRole('button', { name: 'Undo' }));
    await expect(await page.findByText('Saved locally')).toBeVisible();
  },
};

export const ExportImportIdentity: Story = {
  args: { url: EDIT },
  play: async ({ canvasElement }) => {
    const createObjectURL = spyOn(URL, 'createObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {}); // no real download
    const exportJson = async () => {
      await userEvent.click(page.getByRole('button', { name: 'Export JSON' }));
      return (createObjectURL.mock.lastCall![0] as Blob).text();
    };

    await page.findByRole('region', { name: 'Revenue' }, WAIT);
    const original = await exportJson();
    await renameRevenue('Temporary');
    await userEvent.click(controls().getByRole('button', { name: 'Undo' }));
    await expect(await exportJson()).toBe(original);

    const input = canvasElement.ownerDocument.querySelector<HTMLInputElement>('input[type=file]')!;
    await userEvent.upload(input, new File([original], 'sales.json', { type: 'application/json' }));
    await expect(await page.findByText('Imported dashboard.')).toBeInTheDocument();
    await expect(await exportJson()).toBe(original);
  },
};

export const LeaveGuard: Story = {
  args: { url: EDIT },
  parameters: {
    // Mantine renders the modal header as a <header>, which axe counts as a second banner landmark.
    a11y: {
      config: {
        rules: [
          { id: 'color-contrast', enabled: false },
          { id: 'landmark-no-duplicate-banner', enabled: false },
          { id: 'landmark-unique', enabled: false },
        ],
      },
    },
  },
  play: async () => {
    await renameRevenue('Unsaved revenue');
    await userEvent.click(page.getByRole('link', { name: 'Operations' }));
    await page.findByRole('dialog', { name: 'Leave with unsaved changes?' }, WAIT);
    await userEvent.click(page.getByRole('button', { name: 'Keep editing' }));
    await expect(page.getByRole('heading', { level: 1, name: 'Sales overview' })).toBeVisible();
    await expect(page.getByText('Unsaved changes')).toBeVisible();
  },
};
