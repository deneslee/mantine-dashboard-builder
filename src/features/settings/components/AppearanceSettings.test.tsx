import { describe, expect, it } from 'vitest';
import { createShellStore, ShellProvider } from '@/features/shell';
import { fireEvent, render, screen } from '@/test/render';
import { AppearanceSettings } from './AppearanceSettings';

function setup() {
  const store = createShellStore({ narrow: false }, false);
  render(
    <ShellProvider store={store}>
      <AppearanceSettings />
    </ShellProvider>,
  );
  const burger = () => store.getState().sidebar.burger;
  return { burger };
}

describe('AppearanceSettings', () => {
  it('keeps a changed option as a draft until "Save changes"', () => {
    const { burger } = setup();
    const save = screen.getByRole('button', { name: 'Save changes' });
    expect(save).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: /Hide completely/ }));
    expect(burger()).toBe('compact');
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument();

    fireEvent.click(save);
    expect(burger()).toBe('hide');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
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
