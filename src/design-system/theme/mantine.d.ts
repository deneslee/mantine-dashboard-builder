import type { Tokens } from '../tokens/tokens';

declare module '@mantine/core' {
  // Declaration merging: theme.other is typed as the token object.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface MantineThemeOther extends Tokens {}
}
