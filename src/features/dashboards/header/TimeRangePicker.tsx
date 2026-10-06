import { Combobox, InputBase, useCombobox } from '@mantine/core';
import { DatePicker, type DatesRangeValue } from '@mantine/dates';
import { IconClock } from '@tabler/icons-react';
import { useState } from 'react';
import { iconSize, iconStroke } from '@/ui/tokens/semantic';
import { dayRange, RANGE_PRESETS, type TimeRange } from '@/core/time/timeRange';
import { formatRange } from './formatRange';

const CUSTOM = 'custom';

interface Props {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  /** The dashboard's: calendar days start at its midnight, and dates show in it. */
  timeZone: string;
}

/** Relative presets, or whole days from a calendar ("Custom range…"). Controlled: the URL holds the value. */
export function TimeRangePicker({ value, onChange, timeZone }: Props) {
  const [isCustom, setCustom] = useState(false);
  const [days, setDays] = useState<DatesRangeValue>([null, null]);
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setCustom(false);
    },
  });

  const handlePick = (range: TimeRange) => {
    onChange(range);
    combobox.closeDropdown();
  };

  const handlePickDays = (next: DatesRangeValue) => {
    setDays(next);
    const [start, end] = next;
    if (start && end) handlePick(dayRange(String(start), String(end), timeZone));
  };

  return (
    <Combobox
      store={combobox}
      width="max-content"
      position="bottom-start"
      onOptionSubmit={(option) =>
        option === CUSTOM ? setCustom(true) : handlePick({ from: option, to: 'now' })
      }
    >
      <Combobox.Target targetType="button">
        <InputBase
          component="button"
          type="button"
          size="xs"
          pointer
          aria-label="Time range"
          leftSection={<IconClock size={iconSize.xs} stroke={iconStroke} />}
          rightSection={<Combobox.Chevron />}
          rightSectionPointerEvents="none"
          onClick={() => combobox.toggleDropdown()}
        >
          {formatRange(value, timeZone)}
        </InputBase>
      </Combobox.Target>
      <Combobox.Dropdown>
        {isCustom ? (
          <DatePicker type="range" value={days} onChange={handlePickDays} />
        ) : (
          <Combobox.Options>
            {RANGE_PRESETS.map((preset) => (
              <Combobox.Option
                key={preset.from}
                value={preset.from}
                active={value.to === 'now' && value.from === preset.from}
              >
                {preset.label}
              </Combobox.Option>
            ))}
            <Combobox.Option value={CUSTOM}>Custom range…</Combobox.Option>
          </Combobox.Options>
        )}
      </Combobox.Dropdown>
    </Combobox>
  );
}
