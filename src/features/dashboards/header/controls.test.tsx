import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/testing/render';
import { RefreshPicker } from './RefreshPicker';
import { TimeRangePicker } from './TimeRangePicker';

describe('TimeRangePicker', () => {
  it('shows the preset name and picks another preset by keyboard', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TimeRangePicker value={{ from: 'now-24h', to: 'now' }} onChange={onChange} timeZone="UTC" />);

    const trigger = screen.getByRole('button', { name: 'Time range' });
    expect(trigger).toHaveTextContent('Last 24 hours');

    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(await screen.findByRole('option', { name: 'Last 7 days' })).toBeInTheDocument();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith({ from: 'now-7d', to: 'now' });
  });

  it('labels an absolute range with its days', () => {
    render(
      <TimeRangePicker
        value={{ from: '2026-09-20T00:00:00.000Z', to: '2026-09-26T23:59:59.999Z' }}
        onChange={() => {}}
        timeZone="UTC"
      />,
    );
    expect(screen.getByRole('button', { name: 'Time range' })).toHaveTextContent('20 Sep 2026 – 26 Sep 2026');
  });
});

describe('RefreshPicker', () => {
  it('picks an interval by keyboard', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RefreshPicker value="off" onChange={onChange} />);

    await user.tab();
    expect(screen.getByRole('combobox', { name: 'Auto-refresh' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('30s');
  });

  it('shows an interval from a shared URL that is not in the list', () => {
    render(<RefreshPicker value="2m" onChange={() => {}} />);
    expect(screen.getByRole('combobox', { name: 'Auto-refresh' })).toHaveValue('Every 2m');
  });
});
