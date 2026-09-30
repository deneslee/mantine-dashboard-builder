import { Menu } from '@mantine/core';
import { shadow, shape } from '../../tokens/semantic';

export const MenuTheme = Menu.extend({
  defaultProps: {
    shadow: shadow.overlay,
    radius: shape.container,
    width: 200,
    position: 'bottom-end',
    withinPortal: true,
  },
});
