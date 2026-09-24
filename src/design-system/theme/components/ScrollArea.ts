import { ScrollArea } from '@mantine/core';

export const ScrollAreaTheme = ScrollArea.extend({
  defaultProps: {
    type: 'hover',
    scrollbarSize: 8,
    offsetScrollbars: false,
  },
});
