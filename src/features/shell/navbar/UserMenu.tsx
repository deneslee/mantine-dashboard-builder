import { Avatar, Menu, Text } from '@mantine/core';
import { IconLogout, IconUserCircle } from '@tabler/icons-react';
import { use } from 'react';
import { CurrentUserContext } from '@/shared/user';
import classes from './UserMenu.module.css';

/** Placeholder until auth exists; reads the `CurrentUser` context so it swaps cleanly later. */
export function UserMenu() {
  const user = use(CurrentUserContext);
  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Menu>
      <Menu.Target>
        <Avatar
          component="button"
          type="button"
          size={28}
          radius="xl"
          color="indigo"
          variant="filled"
          aria-label={`Account: ${user.name}`}
          className={classes.avatar}
        >
          {initials}
        </Avatar>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>
          <Text size="sm" fw={500} c="var(--mantine-color-text)">
            {user.name}
          </Text>
          <Text size="xs" c="dimmed">
            {user.email}
          </Text>
        </Menu.Label>
        <Menu.Divider />
        <Menu.Item leftSection={<IconUserCircle size={16} />}>Profile</Menu.Item>
        <Menu.Item leftSection={<IconLogout size={16} />} color="red">
          Sign out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
