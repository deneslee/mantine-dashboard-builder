import { NavLink } from '@mantine/core';
import navLink from '../styles/NavLink.module.css';

export const NavLinkTheme = NavLink.extend({
  defaultProps: {
    variant: 'sidebar',
    childrenOffset: 28,
    noWrap: true,
  },
  classNames: navLink,
});
