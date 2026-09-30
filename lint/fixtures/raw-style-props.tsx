// Lint fixture: every line below breaks a token rule. `lint/rules.test.ts` checks that each one is
// reported; `pnpm lint` skips this folder (`--ignore-pattern` in package.json).
import { Group } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import { palette } from '@/ui/tokens/primitives';

export const RawStyleProps = () => (
  <Group gap={4} c="red" fw={600}>
    <IconX size={16} stroke={1.5} />
    {palette.red[0]}
  </Group>
);
