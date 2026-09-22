import { Button } from '@mantine/core';
import { spotlight } from '@mantine/spotlight';
import { IconArrowLeft, IconHome, IconSearch } from '@tabler/icons-react';
import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import { ErrorState } from './ErrorState';

/** 404 inside the chrome: the shell stays, only the content area changes. */
export function NotFound() {
  const navigate = useNavigate();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <ErrorState.Full
      code="404"
      title="This page doesn't exist"
      description={`Nothing lives at ${pathname}. It may have been moved, or the link is wrong.`}
      actions={
        <>
          <Button
            variant="default"
            size="sm"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => router.history.back()}
          >
            Go back
          </Button>
          <Button variant="default" size="sm" leftSection={<IconSearch size={16} />} onClick={spotlight.open}>
            Search
          </Button>
          <Button
            size="sm"
            leftSection={<IconHome size={16} />}
            onClick={() => void navigate({ to: '/dashboards' })}
          >
            Dashboards
          </Button>
        </>
      }
    />
  );
}
