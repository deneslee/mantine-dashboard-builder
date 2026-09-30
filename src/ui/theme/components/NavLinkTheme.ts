import { NavLink } from '@mantine/core';
import navLink from './NavLinkTheme.module.css';

export const NavLinkTheme = NavLink.extend({
  defaultProps: {
    variant: 'sidebar',
    childrenOffset: 28,
    noWrap: true,
  },
  classNames: navLink,
});
