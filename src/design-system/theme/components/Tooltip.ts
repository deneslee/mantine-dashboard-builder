import { Tooltip, TooltipGroup } from '@mantine/core';
import { shape } from '../../tokens/semantic';

const openDelay = 400;

export const TooltipTheme = Tooltip.extend({
  defaultProps: {
    openDelay,
    withArrow: false,
    position: 'bottom',
    fz: 'xs',
    radius: shape.control,
  },
});

/** Rows of icon buttons: the first tooltip waits, its neighbours then open at once. */
export const TooltipGroupTheme = TooltipGroup.extend({
  defaultProps: {
    openDelay,
    closeDelay: 100,
  },
});
