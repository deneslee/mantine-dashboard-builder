import { Drawer } from '@mantine/core';
import { shape } from '../../tokens/semantic';

export const DrawerTheme = Drawer.extend({
  defaultProps: {
    radius: shape.container,
    overlayProps: { backgroundOpacity: 0.35, blur: 2 },
    transitionProps: { duration: 180 },
  },
});
