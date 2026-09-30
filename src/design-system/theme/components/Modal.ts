import { Modal } from '@mantine/core';
import { shadow, shape } from '../../tokens/semantic';

export const ModalTheme = Modal.extend({
  defaultProps: {
    centered: true,
    shadow: shadow.overlay,
    radius: shape.container,
    overlayProps: { backgroundOpacity: 0.45, blur: 2 },
    // Mantine's close button is an icon with no text; screen readers need a name.
    closeButtonProps: { 'aria-label': 'Close dialog' },
  },
});
