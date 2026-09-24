import { Notifications } from '@mantine/notifications';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@/testing/render';
import { notify } from './notify';
import { useInbox } from '@/stores/inbox';

describe('notify', () => {
  beforeEach(() => {
    useInbox.setState({ items: [] });
    notify.clean();
  });

  it('shows errors as alerts and records them in the inbox', async () => {
    render(<Notifications />);
    act(() => {
      notify.error({ title: 'Import failed', message: 'Invalid JSON at line 12.', source: 'Import' });
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Import failed');
    expect(useInbox.getState().items).toHaveLength(1);
    expect(useInbox.getState().items[0]).toMatchObject({
      level: 'error',
      title: 'Import failed',
      read: false,
    });
  });

  it('does not record success or info in the inbox', () => {
    notify.success({ title: 'Dashboard saved' });
    notify.info({ title: 'Layout reset' });
    expect(useInbox.getState().items).toHaveLength(0);
  });

  it('dedupes repeats into one toast and one inbox entry with a count', async () => {
    render(<Notifications />);
    act(() => {
      notify.error({ title: 'Widget failed to load' });
      notify.error({ title: 'Widget failed to load' });
      notify.error({ title: 'Widget failed to load' });
    });
    expect(await screen.findAllByRole('alert')).toHaveLength(1);
    expect(useInbox.getState().items).toHaveLength(1);
    expect(useInbox.getState().items[0]?.count).toBe(3);
  });
});
