import { Menu } from '@mantine/core';
import { shape } from '../../tokens/semantic';

export const MenuTheme = Menu.extend({
  defaultProps: {
    shadow: 'md',
    radius: shape.container,
    width: 200,
    position: 'bottom-end',
    withinPortal: true,
  },
});
