import { Alert } from '@mantine/core';
import { shape } from '../../tokens/semantic';

export const AlertTheme = Alert.extend({
  defaultProps: {
    variant: 'light',
    radius: shape.container,
  },
});
