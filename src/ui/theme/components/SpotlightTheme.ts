import { Spotlight } from '@mantine/spotlight';
import { shadow } from '../../tokens/semantic';

export const SpotlightTheme = Spotlight.extend({
  defaultProps: {
    shadow: shadow.overlay,
  },
});
