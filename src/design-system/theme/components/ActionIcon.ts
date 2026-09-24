import { ActionIcon } from '@mantine/core';
import { shape } from '../../tokens/semantic';
import actionIcon from '../styles/ActionIcon.module.css';

export const ActionIconTheme = ActionIcon.extend({
  defaultProps: {
    variant: 'subtle',
    color: 'gray',
    size: 'lg',
    radius: shape.control,
  },
  classNames: actionIcon,
});
