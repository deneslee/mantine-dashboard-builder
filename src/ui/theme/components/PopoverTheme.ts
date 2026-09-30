import { Popover } from '@mantine/core';
import { shadow, shape } from '../../tokens/semantic';

export const PopoverTheme = Popover.extend({
  defaultProps: {
    shadow: shadow.overlay,
    radius: shape.container,
    withinPortal: true,
  },
});
