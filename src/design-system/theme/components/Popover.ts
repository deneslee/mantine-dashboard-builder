import { Popover } from '@mantine/core';
import { shape } from '../../tokens/semantic';

export const PopoverTheme = Popover.extend({
  defaultProps: {
    shadow: 'md',
    radius: shape.container,
    withinPortal: true,
  },
});
