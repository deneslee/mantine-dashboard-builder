import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/testing/render';
import { AppError } from '@/lib/errors';
import { WidgetBoundary } from './WidgetBoundary';

let shouldThrow = true;
function Flaky() {
  if (shouldThrow) throw new AppError('datasource', 'Haystack returned 502.');
  return <p>Loaded</p>;
}

describe('WidgetBoundary', () => {
  it('contains the error in the tile and recovers on retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <>
        <WidgetBoundary name="Alarms">
          <Flaky />
        </WidgetBoundary>
        <p>Sibling still renders</p>
      </>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Alarms: data source error');
    expect(screen.getByText('Haystack returned 502.')).toBeInTheDocument();
    expect(screen.getByText('Sibling still renders')).toBeInTheDocument();

    shouldThrow = false;
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  });

  it('hides Retry for errors that retrying will not fix', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function Invalid(): never {
      throw new AppError('validation', 'Unexpected shape.');
    }
    render(
      <WidgetBoundary>
        <Invalid />
      </WidgetBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid data');
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });
});
