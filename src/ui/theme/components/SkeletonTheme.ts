import { Skeleton } from '@mantine/core';
import { shape } from '../../tokens/semantic';

export const SkeletonTheme = Skeleton.extend({
  defaultProps: {
    radius: shape.control,
    animate: true,
  },
});
