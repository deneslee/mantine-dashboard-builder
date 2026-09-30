import { Notification } from '@mantine/core';
import { shape } from '../../tokens/semantic';

export const NotificationTheme = Notification.extend({
  defaultProps: {
    radius: shape.container,
    withBorder: true,
    // Mantine's close button is an icon with no text; screen readers need a name.
    closeButtonProps: { 'aria-label': 'Dismiss notification' },
  },
});
