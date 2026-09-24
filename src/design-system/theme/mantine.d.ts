import type { DefaultMantineColor, MantineColorsTuple } from '@mantine/core';
import type { Tokens } from '../tokens/tokens';

declare module '@mantine/core' {
  export interface MantineThemeSizesOverride {
    spacing: Record<'3xs' | '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl', string>;
  }

  export interface MantineThemeColorsOverride {
    colors: Record<
      | DefaultMantineColor
      | 'brand'
      | 'neutral'
      | 'danger'
      | 'warning'
      | 'success'
      | 'info',
      MantineColorsTuple
    >;
  }

  // Declaration merging: theme.other is typed as the token object.
  // oxlint-disable-next-line typescript/no-empty-object-type
  export interface MantineThemeOther extends Tokens {}

  // Menu forwards unknown props to its Popover, which supports `withRoles`; Menu's types omit it.
  // Used when the target button manages its own ARIA (sidebar sections: disclosure or menu button).
  // Sidebar.test.tsx checks the resulting attributes, so an upgrade that drops it fails there.
  export interface MenuProps {
    withRoles?: boolean;
  }
}
