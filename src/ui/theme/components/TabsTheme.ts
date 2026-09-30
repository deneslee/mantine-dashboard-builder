import { Tabs } from '@mantine/core';
import tabs from './TabsTheme.module.css';

export const TabsTheme = Tabs.extend({
  defaultProps: {
    variant: 'default',
  },
  classNames: tabs,
});
