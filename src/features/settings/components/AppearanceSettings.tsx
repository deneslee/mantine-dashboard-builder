import { Button, Group, Radio, SegmentedControl, Stack, Text } from '@mantine/core';
import { IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react';
import type { BurgerBehavior } from '@/components/layouts/shell/model/types';
import { useAppearanceForm } from '../hooks/useAppearanceForm';
import { SettingsRow, SettingsSection } from './SettingsSection';
import classes from './AppearanceSettings.module.css';

const burgerOptions: { value: BurgerBehavior; label: string; description: string }[] = [
  {
    value: 'compact',
    label: 'Collapse to icons',
    description: 'Switches between the full sidebar and a narrow icon rail.',
  },
  {
    value: 'hide',
    label: 'Hide completely',
    description: 'Switches between the full sidebar and no sidebar.',
  },
  {
    value: 'cycle',
    label: 'Cycle through both',
    description: 'Full sidebar, then icons, then hidden.',
  },
];

const themeOptions = [
  { value: 'light', label: 'Light', icon: IconSun },
  { value: 'dark', label: 'Dark', icon: IconMoon },
  { value: 'auto', label: 'System', icon: IconDeviceDesktop },
] as const;

const motionOptions = [
  { value: 'system', label: 'Follow system' },
  { value: 'reduce', label: 'Reduce' },
] as const;

/** Appearance tab. Changes are a draft until "Save changes". */
export function AppearanceSettings() {
  const { values, dirty, saving, setField, save, reset } = useAppearanceForm();

  return (
    <form
      className={classes.form}
      aria-busy={saving}
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      {/* Locked while saving so an edit can't land between submit and the draft being cleared. */}
      <fieldset disabled={saving} className={classes.fields}>
        <SettingsSection title="Sidebar" description="How the navigation sidebar behaves on wide screens.">
          <SettingsRow
            label="Menu button"
            labelId="settings-burger"
            description="What the menu button in the top bar does to the docked sidebar. On small screens it always opens the sidebar as a drawer."
          >
            <Radio.Group
              aria-labelledby="settings-burger"
              value={values.burger}
              onChange={(value) => {
                const option = burgerOptions.find((o) => o.value === value);
                if (option) setField('burger', option.value);
              }}
            >
              <Stack gap="xs">
                {burgerOptions.map((o) => (
                  <Radio.Card key={o.value} value={o.value} radius="md" className={classes.option}>
                    <Group wrap="nowrap" align="flex-start" gap="sm">
                      <Radio.Indicator mt={2} />
                      <div>
                        <Text className={classes.optionLabel}>{o.label}</Text>
                        <Text className={classes.optionHelp}>{o.description}</Text>
                      </div>
                    </Group>
                  </Radio.Card>
                ))}
              </Stack>
            </Radio.Group>
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Theme" description="Colors used across the app.">
          <SettingsRow
            label="Color scheme"
            labelId="settings-theme"
            description="System follows your operating system setting."
          >
            <SegmentedControl
              aria-labelledby="settings-theme"
              value={values.colorScheme}
              onChange={(value) => {
                const option = themeOptions.find((o) => o.value === value);
                if (option) setField('colorScheme', option.value);
              }}
              data={themeOptions.map((o) => ({
                value: o.value,
                label: (
                  <Group gap={6} wrap="nowrap" justify="center">
                    <o.icon size={16} stroke={1.75} />
                    <span>{o.label}</span>
                  </Group>
                ),
              }))}
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Motion" description="Animations across the app.">
          <SettingsRow
            label="Animations"
            labelId="settings-motion"
            description="Reduce makes panels, menus and drawers appear instantly. Follow system uses your operating system's reduced-motion setting."
          >
            <SegmentedControl
              aria-labelledby="settings-motion"
              value={values.motion}
              onChange={(value) => {
                const option = motionOptions.find((o) => o.value === value);
                if (option) setField('motion', option.value);
              }}
              data={motionOptions.map((o) => ({ value: o.value, label: o.label }))}
            />
          </SettingsRow>
        </SettingsSection>
      </fieldset>

      <div className={classes.actions}>
        {dirty && !saving ? <Text className={classes.status}>You have unsaved changes.</Text> : null}
        <Button variant="default" disabled={!dirty || saving} onClick={reset}>
          Discard
        </Button>
        <Button type="submit" disabled={!dirty} loading={saving}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
