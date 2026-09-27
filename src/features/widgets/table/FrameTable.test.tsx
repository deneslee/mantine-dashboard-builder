import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor, within } from '@/testing/render';
import type { DataFrame } from '@/types/dataframe';
import { FrameTable } from './FrameTable';
import { tableOptions } from './options';

const regions: DataFrame = {
  length: 3,
  fields: [
    { name: 'region', type: 'string', values: ['Nordics', 'Benelux', 'Iberia'], config: { label: 'Region' } },
    { name: 'revenue', type: 'number', values: [2000, 3000, 1000], config: { label: 'Revenue', unit: '€' } },
    { name: 'share', type: 'number', values: [0.333, 0.5, 0.167], config: { label: 'Share' } },
  ],
};

const options = tableOptions.parse({ columns: { share: { format: 'percent' } } });

/** The first cell of every body row, top to bottom. */
const firstColumn = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]?.textContent);

const header = (name: string) => screen.getByRole('columnheader', { name });

describe('FrameTable', () => {
  // jsdom lays nothing out; the virtualizer reads the viewport's height to decide which rows to render.
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(400);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(600);
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders a column per field with labels, units and percent formatting', () => {
    render(<FrameTable frames={[regions]} options={options} />);
    expect(screen.getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Region',
      'Revenue',
      'Share',
    ]);
    expect(firstColumn()).toEqual(['Nordics', 'Benelux', 'Iberia']);
    expect(screen.getByText('€ 3 000')).toBeInTheDocument();
    expect(screen.getByText('50.0%')).toBeInTheDocument();
  });

  it('sorts by a header, toggles the direction and exposes it with aria-sort', async () => {
    const user = userEvent.setup();
    render(<FrameTable frames={[regions]} options={options} />);

    await user.click(screen.getByRole('button', { name: 'Region' }));
    expect(header('Region')).toHaveAttribute('aria-sort', 'ascending');
    expect(firstColumn()).toEqual(['Benelux', 'Iberia', 'Nordics']);

    await user.click(screen.getByRole('button', { name: 'Region' }));
    expect(header('Region')).toHaveAttribute('aria-sort', 'descending');
    expect(firstColumn()).toEqual(['Nordics', 'Iberia', 'Benelux']);

    // Keyboard, on another column: the previous sort is replaced.
    screen.getByRole('button', { name: 'Revenue' }).focus();
    await user.keyboard('{Enter}');
    expect(header('Region')).not.toHaveAttribute('aria-sort');
    const direction = header('Revenue').getAttribute('aria-sort');
    expect(firstColumn()).toEqual(
      direction === 'ascending' ? ['Iberia', 'Nordics', 'Benelux'] : ['Benelux', 'Nordics', 'Iberia'],
    );
  });

  it('keeps only a window of a 10 000-row frame in the DOM, and moves it on scroll', async () => {
    const rows = 10_000;
    const big: DataFrame = {
      length: rows,
      fields: [{ name: 'n', type: 'number', values: Array.from({ length: rows }, (_, i) => i) }],
    };
    const { container } = render(<FrameTable frames={[big]} options={tableOptions.parse({})} />);
    const rendered = screen.getAllByRole('row').length - 1;
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(60);
    expect(firstColumn()[0]).toBe('0');

    // Scrolling halfway swaps the window for rows from the middle.
    const viewport = container.querySelector<HTMLElement>('.mantine-ScrollArea-viewport');
    if (!viewport) throw new Error('No scroll viewport');
    act(() => {
      viewport.scrollTop = 32 * 5000;
      viewport.dispatchEvent(new Event('scroll'));
    });
    // Numbers show with a thousands separator ("4 988").
    await waitFor(() => expect(Number(firstColumn()[0]?.replace(/\s/g, ''))).toBeGreaterThan(4900));
    expect(screen.getAllByRole('row').length - 1).toBeLessThan(60);
  });
});
