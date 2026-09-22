import { Button } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { errorTitles, toAppError } from '@/shared/errors';
import { ErrorState } from './ErrorState';

/** Route `errorComponent`: loader or render failure inside the content area; chrome keeps working. */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  const queryReset = useQueryErrorResetBoundary();
  const [retrying, setRetrying] = useState(false);
  const appError = toAppError(error);

  // Let TanStack Query refetch on the next attempt instead of replaying the cached error.
  useEffect(() => {
    queryReset.reset();
  }, [queryReset]);

  const retry = async () => {
    setRetrying(true);
    try {
      await router.invalidate();
      reset();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <ErrorState.Full
      title={errorTitles[appError.code]}
      description={appError.message}
      details={error}
      actions={
        <Button
          size="sm"
          leftSection={<IconRefresh size={16} />}
          onClick={() => void retry()}
          loading={retrying}
        >
          Try again
        </Button>
      }
    />
  );
}
