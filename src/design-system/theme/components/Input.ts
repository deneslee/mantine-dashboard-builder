import { Input } from '@mantine/core';
import { shape } from '../../tokens/semantic';

export const InputTheme = Input.extend({
  defaultProps: {
    radius: shape.control,
  },
});
