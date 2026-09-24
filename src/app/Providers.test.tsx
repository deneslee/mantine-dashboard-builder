import { useMantineTheme } from '@mantine/core';
import { act, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MOTION_STORAGE_KEY, useMotionPreference } from '@/shared/hooks/useMotion';
import { createQueryClient } from './queryClient';
import { Providers } from './Providers';

function DrawerDuration() {
  const theme = useMantineTheme();
  return <output>{String(theme.components.Drawer?.defaultProps?.transitionProps?.duration)}</output>;
}

const renderApp = () =>
  render(
    <Providers queryClient={createQueryClient()}>
      <DrawerDuration />
    </Providers>,
  );

afterEach(() => document.documentElement.removeAttribute('data-motion'));

describe('Providers: reduced motion', () => {
  it('keeps normal motion by default', () => {
    const { getByRole } = renderApp();
    expect(document.documentElement).not.toHaveAttribute('data-motion');
    expect(getByRole('status')).toHaveTextContent('180');
  });

  it('marks <html> and zeroes Mantine transitions when the user chose "reduce"', () => {
    localStorage.setItem(MOTION_STORAGE_KEY, 'reduce');
    const { getByRole } = renderApp();
    expect(document.documentElement).toHaveAttribute('data-motion', 'reduce');
    expect(getByRole('status')).toHaveTextContent('0');
  });

  it('follows a change of the setting without a reload', () => {
    const { getByRole } = renderApp();
    const setting = renderHook(() => useMotionPreference());

    act(() => setting.result.current[1]('reduce'));
    expect(document.documentElement).toHaveAttribute('data-motion', 'reduce');
    expect(getByRole('status')).toHaveTextContent('0');

    act(() => setting.result.current[1]('system'));
    expect(document.documentElement).not.toHaveAttribute('data-motion');
  });
});
