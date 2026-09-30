import { ScrollArea } from '@mantine/core';

export const ScrollAreaTheme = ScrollArea.extend({
  defaultProps: {
    type: 'hover',
    scrollbarSize: 6,
    offsetScrollbars: false,
  },
});
