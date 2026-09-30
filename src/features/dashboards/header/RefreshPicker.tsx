import { Select } from '@mantine/core';
import { IconRefreshDot } from '@tabler/icons-react';
import { iconSize, iconStroke } from '@/ui/tokens/semantic';
import { refreshOptions } from '@/core/time/timeRange';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/** How often the dashboard refetches. Controlled: the URL holds the value. */
export function RefreshPicker({ value, onChange }: Props) {
  // A valid interval from a shared URL that isn't in the list still shows.
  const data = refreshOptions.some((option) => option.value === value)
    ? refreshOptions
    : [...refreshOptions, { value, label: `Every ${value}` }];
  return (
    <Select
      size="xs"
      w={170}
      aria-label="Auto-refresh"
      leftSection={<IconRefreshDot size={iconSize.xs} stroke={iconStroke} />}
      data={data}
      value={value}
      onChange={(next) => (next ? onChange(next) : undefined)}
      allowDeselect={false}
    />
  );
}
