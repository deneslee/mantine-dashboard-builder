import { Button } from '@mantine/core';
import { spotlight } from '@mantine/spotlight';
import { IconArrowLeft, IconHome, IconSearch } from '@tabler/icons-react';
import { useNavigate, useRouter, useRouterState } from '@tanstack/react-router';
import { iconSize } from '@/ui/tokens/semantic';
import { ErrorState } from '@/ui/components/ErrorState';

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
            leftSection={<IconArrowLeft size={iconSize.sm} />}
            onClick={() => router.history.back()}
          >
            Go back
          </Button>
          <Button
            variant="default"
            size="sm"
            leftSection={<IconSearch size={iconSize.sm} />}
            onClick={spotlight.open}
          >
            Search
          </Button>
          <Button
            size="sm"
            leftSection={<IconHome size={iconSize.sm} />}
            onClick={() => void navigate({ to: '/dashboards' })}
          >
            Dashboards
          </Button>
        </>
      }
    />
  );
}
