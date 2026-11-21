import { Alert, Button, Group, TextInput } from '@mantine/core';
import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toAppError } from '@/core/errors/AppError';
import { notify } from '@/lib/notify/notify';
import { resetRecordProvider } from '@/lib/records/activeRecordProvider';
import { getPlaceSetting, setPlaceSetting } from '@/lib/records/placeSetting';
import type { RecordProviderSetup } from '@/plugins/RecordProviderPlugin';
import { Section, SectionBody, SectionRow } from '@/ui/components/Section';
import { iconSize, iconStroke } from '@/ui/tokens/semantic';
import { statusKey } from './useRecordProviderStatus';

const TEST_TIMEOUT_MS = 30_000;

type TestResult =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'passed'; message: string }
  | { status: 'failed'; message: string };

/**
 * A place's setting as a form, like a data source's: the value, "Test connection" (unsaved, shows the
 * outcome in an alert) and "Save" (a toast says it worked, and the place's status is checked again).
 */
export function PlaceSetupForm({ id, setup }: { id: string; setup: RecordProviderSetup }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(() => getPlaceSetting(id));
  const [error, setError] = useState<string>();
  const [test, setTest] = useState<TestResult>({ status: 'idle' });

  const edit = (next: string) => {
    setValue(next);
    setError(undefined);
    setTest({ status: 'idle' });
  };

  const check = (): string | null => {
    const problem = setup.validate(value);
    setError(problem ?? undefined);
    return problem;
  };

  const handleTest = async () => {
    if (check()) return;
    setTest({ status: 'testing' });
    try {
      const message = await setup.test(value.trim(), AbortSignal.timeout(TEST_TIMEOUT_MS));
      setTest({ status: 'passed', message });
    } catch (caught) {
      setTest({ status: 'failed', message: toAppError(caught).message });
    }
  };

  const handleSave = () => {
    if (check()) return;
    const result = setPlaceSetting(id, value.trim());
    if (!result.ok) {
      notify.error({ title: 'Could not save the setting', message: result.message });
      return;
    }
    resetRecordProvider(id);
    void queryClient.invalidateQueries({ queryKey: statusKey(id) });
    notify.success({ title: `${setup.label} saved` });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSave();
      }}
    >
      <Section title="Connection" description="Stored in this browser as it is: nothing here is secret.">
        <SectionRow label={setup.label} labelId={`${id}-setup`} description={setup.description}>
          <TextInput
            aria-labelledby={`${id}-setup`}
            type="url"
            placeholder={setup.placeholder}
            value={value}
            error={error}
            onChange={(event) => edit(event.currentTarget.value)}
          />
        </SectionRow>
        {test.status === 'passed' || test.status === 'failed' ? (
          <SectionBody>
            {test.status === 'passed' ? (
              <Alert
                color="success"
                icon={<IconCircleCheck size={iconSize.sm} stroke={iconStroke} />}
                title="Connected"
                role="status"
              >
                {test.message}
              </Alert>
            ) : (
              <Alert
                color="danger"
                icon={<IconAlertTriangle size={iconSize.sm} stroke={iconStroke} />}
                title="The test failed"
                role="alert"
              >
                {test.message}
              </Alert>
            )}
          </SectionBody>
        ) : null}
        <SectionBody>
          <Group gap="xs" justify="flex-end">
            <Button variant="default" onClick={() => void handleTest()} loading={test.status === 'testing'}>
              Test connection
            </Button>
            <Button type="submit">Save</Button>
          </Group>
        </SectionBody>
      </Section>
    </form>
  );
}
