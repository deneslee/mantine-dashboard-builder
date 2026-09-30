import { Card } from '@mantine/core';
import { shape } from '../../tokens/semantic';

export const CardTheme = Card.extend({
  defaultProps: {
    radius: shape.container,
  },
});
