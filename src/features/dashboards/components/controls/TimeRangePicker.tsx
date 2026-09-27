import { Combobox, InputBase, useCombobox } from '@mantine/core';
import { DatePicker, type DatesRangeValue } from '@mantine/dates';
import { IconClock } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useState } from 'react';
import { iconSize, iconStroke } from '@/design-system/tokens/semantic';
import { rangePresets, type RawRange } from '../../model/timeRange';
import { rangeLabel } from './rangeLabel';

const CUSTOM = 'custom';

interface Props {
  value: RawRange;
  onChange: (range: RawRange) => void;
}

/** Relative presets, or whole days from a calendar ("Custom range…"). Controlled: the URL holds the value. */
export function TimeRangePicker({ value, onChange }: Props) {
  const [custom, setCustom] = useState(false);
  const [days, setDays] = useState<DatesRangeValue>([null, null]);
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setCustom(false);
    },
  });

  const pick = (range: RawRange) => {
    onChange(range);
    combobox.closeDropdown();
  };

  const pickDays = (next: DatesRangeValue) => {
    setDays(next);
    const [start, end] = next;
    if (start && end)
      pick({ from: dayjs(start).startOf('day').toISOString(), to: dayjs(end).endOf('day').toISOString() });
  };

  return (
    <Combobox
      store={combobox}
      width="max-content"
      position="bottom-start"
      onOptionSubmit={(option) => (option === CUSTOM ? setCustom(true) : pick({ from: option, to: 'now' }))}
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
          {rangeLabel(value)}
        </InputBase>
      </Combobox.Target>
      <Combobox.Dropdown>
        {custom ? (
          <DatePicker type="range" value={days} onChange={pickDays} />
        ) : (
          <Combobox.Options>
            {rangePresets.map((preset) => (
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
