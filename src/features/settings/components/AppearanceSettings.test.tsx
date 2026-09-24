import { QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '@/app/queryClient';
import { notify } from '@/lib/notify/notify';
import { createShellStore, ShellProvider } from '@/components/layouts/shell';
import { fireEvent, render, screen, waitFor } from '@/testing/render';
import { AppearanceSettings } from './AppearanceSettings';

function setup() {
  const store = createShellStore({ narrow: false }, false);
  render(
    <QueryClientProvider client={createQueryClient()}>
      <ShellProvider store={store}>
        <AppearanceSettings />
      </ShellProvider>
    </QueryClientProvider>,
  );
  const burger = () => store.getState().sidebar.burger;
  return { burger };
}

afterEach(() => vi.restoreAllMocks());

describe('AppearanceSettings', () => {
  it('keeps a changed option as a draft until "Save changes"', () => {
    const { burger } = setup();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: /Hide completely/ }));
    expect(burger()).toBe('compact');
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument();
  });

  it('shows a loading state while saving, then stores the setting and notifies', async () => {
    const success = vi.spyOn(notify, 'success');
    const { burger } = setup();

    fireEvent.click(screen.getByRole('radio', { name: /Hide completely/ }));
    const save = screen.getByRole('button', { name: 'Save changes' });
    fireEvent.click(save);

    await waitFor(() => expect(save).toHaveAttribute('data-loading'));
    expect(screen.getByRole('button', { name: 'Discard' })).toBeDisabled();
    expect(burger()).toBe('compact');

    await waitFor(() => expect(burger()).toBe('hide'));
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith(expect.objectContaining({ title: 'Settings saved' })),
    );
    expect(save).not.toHaveAttribute('data-loading');
    expect(save).toBeDisabled();
  });

  it('saves the motion setting', async () => {
    setup();
    fireEvent.click(screen.getByRole('radio', { name: 'Reduce' }));
    expect(localStorage.getItem('motion.v1')).not.toBe('reduce'); // still a draft

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(localStorage.getItem('motion.v1')).toBe('reduce'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled());
  });

  it('discards the draft without touching the stored setting', () => {
    const { burger } = setup();
    fireEvent.click(screen.getByRole('radio', { name: /Cycle through both/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));

    expect(burger()).toBe('compact');
    expect(screen.getByRole('radio', { name: /Collapse to icons/ })).toBeChecked();
    expect(screen.queryByText('You have unsaved changes.')).not.toBeInTheDocument();
  });
});
