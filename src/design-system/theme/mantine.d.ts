import type { Tokens } from '../tokens/tokens';

declare module '@mantine/core' {
  // Declaration merging: theme.other is typed as the token object.
  // oxlint-disable-next-line typescript/no-empty-object-type
  export interface MantineThemeOther extends Tokens {}
}
