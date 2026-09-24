import { Modal } from '@mantine/core';
import { shape } from '../../tokens/semantic';

export const ModalTheme = Modal.extend({
  defaultProps: {
    centered: true,
    radius: shape.container,
    overlayProps: { backgroundOpacity: 0.45, blur: 2 },
  },
});
