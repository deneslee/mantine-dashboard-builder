import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, spyOn, userEvent, waitFor, within } from 'storybook/test';
import { AppStory } from '@/testing/AppStory';
import { loadDemoDashboard } from '@/testing/fixtures/dashboards';
import { saveDashboard } from './data/dashboardApi';
import { draftKey, writeDraft } from './data/drafts';

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
  beforeEach: async () =>
    saveDashboard({ ...(await loadDemoDashboard('sales')), widgets: {}, layouts: { lg: [] } }),
  play: async () => {
    await expect(await page.findByText('No widgets yet.', {}, WAIT)).toBeVisible();
  },
};

export const StorageError: Story = {
  args: { url: EDIT },
  beforeEach: () => {
    const setItem = localStorage.setItem.bind(localStorage);
    spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      if (key.startsWith(draftKey(''))) throw new DOMException('Quota exceeded', 'QuotaExceededError');
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
  beforeEach: async () => {
    const saved = await loadDemoDashboard('sales');
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

export const QueryApplyUndo: Story = {
  args: { url: `${EDIT}&widget=revenue&editor=queries` },
  play: async () => {
    const editor = await page.findByRole('textbox', { name: 'Queries' }, WAIT);
    const original = (editor as HTMLTextAreaElement).value;
    await userEvent.clear(editor);
    await userEvent.paste(original.replace('"seed": "', '"seed": "edited-'));
    await userEvent.click(page.getByRole('button', { name: 'Apply queries' }));
    await expect(await page.findByText('Unsaved changes')).toBeVisible();
    await userEvent.click(controls().getByRole('button', { name: 'Undo' }));
    // The editor follows the dashboard: Undo brings the old queries back, with nothing left to apply.
    await waitFor(() => expect(editor).toHaveValue(original));
    await expect(page.getByRole('button', { name: 'Apply queries' })).toBeDisabled();
    await expect(page.getByText('Saved locally')).toBeVisible();
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

/**
 * Switching dashboards: the router keeps the old page for up to `defaultPendingMs` (300ms), then the
 * skeleton. With the next file taking a second, the old dashboard must be gone well before it arrives.
 */
export const SwitchDashboard: Story = {
  args: { url: '/dashboards/sales' },
  play: async () => {
    const fetch = window.fetch.bind(window);
    spyOn(window, 'fetch').mockImplementation(async (input, init) => {
      const url = input instanceof Request ? input.url : input.toString();
      if (url.endsWith('/ops.json')) await new Promise((resolve) => setTimeout(resolve, 1000));
      return fetch(input, init);
    });
    await page.findByRole('region', { name: 'Revenue' }, WAIT);
    await userEvent.click(page.getByRole('link', { name: 'Operations' }));
    await waitFor(
      () => expect(page.queryByRole('heading', { name: 'Sales overview' })).not.toBeInTheDocument(),
      { timeout: 700 },
    );
    await expect(await page.findByRole('heading', { name: 'Operations' }, WAIT)).toBeVisible();
  },
};

/** Every widget header button is in the tab order, and the hidden menu button shows on focus. */
export const HeaderKeyboard: Story = {
  args: { url: '/dashboards/sales' },
  play: async () => {
    await page.findByRole('region', { name: 'Revenue' }, WAIT);
    const headerButtons = [...document.querySelectorAll('[data-widget-drag] button')];
    await expect(headerButtons.length).toBeGreaterThanOrEqual(5); // a menu per widget, at least
    const reached = new Set<Element>();
    for (let i = 0; i < 200 && reached.size < headerButtons.length; i++) {
      await userEvent.tab();
      const focused = document.activeElement;
      if (!focused || !headerButtons.includes(focused)) continue;
      reached.add(focused);
      if (focused.hasAttribute('data-widget-menu'))
        await waitFor(() => expect(getComputedStyle(focused).opacity).toBe('1'));
    }
    await expect(reached.size).toBe(headerButtons.length);
  },
};

/** Opens a widget's menu and picks an item, keyboard only. */
async function chooseWithKeyboard(widget: string, item: string) {
  (await page.findByRole('button', { name: `Actions for ${widget}` }, WAIT)).focus();
  await userEvent.keyboard('{Enter}');
  await page.findByRole('menu', {}, WAIT);
  for (let i = 0; i < 12 && document.activeElement?.textContent !== item; i++)
    await userEvent.keyboard('{ArrowDown}');
  await expect(document.activeElement).toHaveTextContent(item);
  await userEvent.keyboard('{Enter}');
}

/**
 * Every action returns focus to a widget's menu button (on the next frame); then one keyboard Undo
 * must take the dashboard back to its saved state.
 */
async function undoOnceWithKeyboard() {
  await waitFor(() => expect(document.activeElement).toHaveAttribute('data-widget-menu'));
  await expect(await page.findByText('Unsaved changes')).toBeVisible();
  controls().getByRole('button', { name: 'Undo' }).focus();
  await userEvent.keyboard('{Enter}');
  await expect(await page.findByText('Saved locally')).toBeVisible();
  await expect(controls().getByRole('button', { name: 'Undo' })).toBeDisabled();
}

/** Move, Resize, Duplicate and Remove without a pointer, each one undo step. */
export const MenuKeyboard: Story = {
  args: { url: EDIT },
  play: async () => {
    await chooseWithKeyboard('Revenue', 'Move to…');
    await page.findByRole('textbox', { name: 'Column' }, WAIT);
    await userEvent.keyboard('{Control>}a{/Control}2{Tab}{Tab}{Enter}');
    await undoOnceWithKeyboard();

    await chooseWithKeyboard('Revenue', 'Resize…');
    await page.findByRole('textbox', { name: 'Width (columns)' }, WAIT);
    await userEvent.keyboard('{Control>}a{/Control}7{Tab}{Tab}{Enter}');
    await undoOnceWithKeyboard();

    await chooseWithKeyboard('Revenue', 'Duplicate');
    await undoOnceWithKeyboard();

    await chooseWithKeyboard('Revenue', 'Remove');
    await undoOnceWithKeyboard();
    await expect(page.getByRole('region', { name: 'Revenue' })).toBeInTheDocument();
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
