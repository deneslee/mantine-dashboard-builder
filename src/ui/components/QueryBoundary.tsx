import { Button } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ERROR_TITLES, toAppError } from '@/core/errors/AppError';
import { iconSize } from '@/ui/tokens/semantic';
import { ErrorState } from './ErrorState';

/**
 * Per-tile boundary: one broken widget shows an inline error, the rest of the dashboard keeps running.
 * Also resets TanStack Query errors on retry.
 */
export function QueryBoundary({
  children,
  name,
  retry,
  resetKeys,
}: {
  children: ReactNode;
  name?: string;
  retry?: () => Promise<unknown>;
  resetKeys?: unknown[];
}) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          resetKeys={resetKeys}
          fallbackRender={({ error, resetErrorBoundary }) => {
            const e = toAppError(error);
            return (
              <ErrorState.Inline
                title={name ? `${name}: ${ERROR_TITLES[e.code].toLowerCase()}` : ERROR_TITLES[e.code]}
                description={e.message}
                details={error}
                actions={
                  e.isRetryable ? (
                    <Button
                      size="xs"
                      variant="default"
                      leftSection={<IconRefresh size={iconSize.xs} />}
                      onClick={() => (retry ? void retry().then(resetErrorBoundary) : resetErrorBoundary())}
                    >
                      Retry
                    </Button>
                  ) : null
                }
              />
            );
          }}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
