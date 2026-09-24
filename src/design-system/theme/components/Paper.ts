import { Paper } from '@mantine/core';
import { shape } from '../../tokens/semantic';
import paper from '../styles/Paper.module.css';

export const PaperTheme = Paper.extend({
  defaultProps: {
    radius: shape.container,
  },
  classNames: paper,
});
