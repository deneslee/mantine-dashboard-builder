import { Tooltip } from '@mantine/core';
import { shape } from '../../tokens/semantic';

export const TooltipTheme = Tooltip.extend({
  defaultProps: {
    openDelay: 400,
    withArrow: false,
    position: 'bottom',
    fz: 'xs',
    radius: shape.control,
  },
});
