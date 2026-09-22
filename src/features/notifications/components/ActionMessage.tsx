import { Button } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import type { NotifyAction } from '../model/types';

/** Toast body with one action button; the action closes the toast. */
export function ActionMessage({
  message,
  action,
  id,
}: {
  message?: string;
  action: NotifyAction;
  id: string;
}) {
  return (
    <>
      {message ? <div>{message}</div> : null}
      <Button
        size="compact-xs"
        variant="light"
        mt={6}
        onClick={() => {
          action.onClick();
          notifications.hide(id);
        }}
      >
        {action.label}
      </Button>
    </>
  );
}
