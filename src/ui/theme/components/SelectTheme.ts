import { Select } from '@mantine/core';
import { shape } from '../../tokens/semantic';

export const SelectTheme = Select.extend({
  defaultProps: {
    radius: shape.control,
    checkIconPosition: 'right',
    allowDeselect: false,
  },
});
