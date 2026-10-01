import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/testing/render';
import { AppError } from '@/core/errors/AppError';
import { QueryBoundary } from './QueryBoundary';

let shouldThrow = true;
function Flaky() {
  if (shouldThrow) throw new AppError('datasource', 'Haystack returned 502.');
  return <p>Loaded</p>;
}

describe('QueryBoundary', () => {
  it('contains the error in the tile and recovers on retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <>
        <QueryBoundary name="Alarms">
          <Flaky />
        </QueryBoundary>
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
      <QueryBoundary>
        <Invalid />
      </QueryBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid data');
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });
});
