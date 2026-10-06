import { ActionIcon, Tooltip } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { useIsFetching } from '@tanstack/react-query';
import { iconSize, iconStroke } from '@/ui/tokens/semantic';
import { dashboardKeys } from '../data/dashboardQueries';
import { useRefreshAll } from '../data/useRefreshAll';

/** A new `now` for every widget. It owns the fetching state, so fetch ticks re-render only this button. */
export function RefreshButton() {
  const refreshAll = useRefreshAll();
  const isFetching = useIsFetching({ queryKey: dashboardKeys.data }) > 0;
  return (
    <Tooltip label="Refresh all widgets">
      <ActionIcon
        variant="default"
        size="lg"
        aria-label="Refresh all widgets"
        loading={isFetching}
        onClick={refreshAll}
      >
        <IconRefresh size={iconSize.md} stroke={iconStroke} />
      </ActionIcon>
    </Tooltip>
  );
}
