import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { AppError } from '@/core/errors/AppError';
import { notify } from '@/lib/notify/notify';
import { getPlaceSetting } from '@/lib/records/placeSetting';
import type { RecordProviderSetup } from '@/plugins/RecordProviderPlugin';
import { fireEvent, render, screen, waitFor } from '@/testing/render';
import { PlaceSetupForm } from './PlaceSetupForm';

const setup = (test: RecordProviderSetup['test']): RecordProviderSetup => ({
  label: 'Deployment URL',
  description: 'From the dashboard.',
  placeholder: 'https://x.convex.cloud',
  validate: (value) => (value.startsWith('https://') ? null : 'Start the URL with https://.'),
  test,
});

const type = (value: string) => fireEvent.change(screen.getByRole('textbox'), { target: { value } });

beforeEach(() => localStorage.clear());

describe('PlaceSetupForm', () => {
  it('shows the problem and does not test or save an invalid value', () => {
    const test = vi.fn();
    render(<PlaceSetupForm id="convex" setup={setup(test)} />);
    type('nope');
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    expect(screen.getByText('Start the URL with https://.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(test).not.toHaveBeenCalled();
    expect(getPlaceSetting('convex')).toBe('');
  });

  it('says "Connected" when the test passes, without saving', async () => {
    render(<PlaceSetupForm id="convex" setup={setup(async () => 'Connected to https://x.convex.cloud.')} />);
    type('https://x.convex.cloud');
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    expect(await screen.findByText('Connected to https://x.convex.cloud.')).toBeInTheDocument();
    expect(getPlaceSetting('convex')).toBe('');
  });

  it('says why the test failed', async () => {
    const test = async () => {
      throw new AppError('unknown', 'No answer in 10 s.');
    };
    render(<PlaceSetupForm id="convex" setup={setup(test)} />);
    type('https://x.convex.cloud');
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }));
    expect(await screen.findByText('The test failed')).toBeInTheDocument();
    expect(screen.getByText('No answer in 10 s.')).toBeInTheDocument();
  });

  it('saves the value and shows a toast', async () => {
    const success = vi.spyOn(notify, 'success');
    render(<PlaceSetupForm id="convex" setup={setup(async () => 'ok')} />);
    type(' https://x.convex.cloud ');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(success).toHaveBeenCalledWith({ title: 'Deployment URL saved' }));
    expect(getPlaceSetting('convex')).toBe('https://x.convex.cloud');
  });
});
