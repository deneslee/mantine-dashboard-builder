import { Button, Center } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import type { FallbackProps } from 'react-error-boundary';
import { ErrorState } from './ErrorState';

/** Last-resort boundary around the whole app. Rendered without the chrome, so it can't depend on it. */
export function AppCrash({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <Center mih="100dvh">
      <ErrorState.Full
        title="The app stopped working"
        description="An unexpected error broke this page. Reloading usually fixes it; your saved work is safe."
        details={error}
        actions={
          <>
            <Button variant="default" size="sm" onClick={resetErrorBoundary}>
              Try to recover
            </Button>
            <Button
              size="sm"
              leftSection={<IconRefresh size={16} />}
              onClick={() => window.location.reload()}
            >
              Reload
            </Button>
          </>
        }
      />
    </Center>
  );
}
