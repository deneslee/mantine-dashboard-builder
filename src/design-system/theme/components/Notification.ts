import { Notification } from '@mantine/core';
import { shape } from '../../tokens/semantic';

export const NotificationTheme = Notification.extend({
  defaultProps: {
    radius: shape.container,
    withBorder: true,
  },
});
