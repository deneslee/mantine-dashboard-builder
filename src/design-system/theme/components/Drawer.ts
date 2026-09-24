import { Drawer } from '@mantine/core';

// No radius: drawers dock to the viewport edge, so rounded corners would show against it.
export const DrawerTheme = Drawer.extend({
  defaultProps: {
    overlayProps: { backgroundOpacity: 0.35, blur: 2 },
    transitionProps: { duration: 180 },
  },
});
