import { Tabs } from '@mantine/core';
import tabs from '../styles/Tabs.module.css';

export const TabsTheme = Tabs.extend({
  defaultProps: {
    variant: 'default',
  },
  classNames: tabs,
});
