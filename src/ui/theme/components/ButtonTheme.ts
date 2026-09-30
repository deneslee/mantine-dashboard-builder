import { Button } from '@mantine/core';
import { shape } from '../../tokens/semantic';

export const ButtonTheme = Button.extend({
  defaultProps: {
    radius: shape.control,
  },
});
