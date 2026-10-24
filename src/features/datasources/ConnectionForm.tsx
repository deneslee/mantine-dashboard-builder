import {
  Alert,
  Button,
  Checkbox,
  FileInput,
  Group,
  PasswordInput,
  Select,
  Text,
  TextInput,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconAlertTriangle, IconCircleCheck, IconLock, IconUpload } from '@tabler/icons-react';
import { useId, useState } from 'react';
import type { Connection, ConnectionField, DatasourceType } from '@/plugins/OptionalPlugin';
import { Section, SectionRow } from '@/ui/components/Section';
import { iconSize, iconStroke } from '@/ui/tokens/semantic';
import { QueryExample } from './QueryExample';
import { isSecret, useConnectionForm } from './useConnectionForm';
import { CreateVaultDialog } from './vault/CreateVaultDialog';
import { UnlockVaultDialog } from './vault/UnlockVaultDialog';
import classes from './ConnectionForm.module.css';

/** A new or saved connection of `type`: its name and id, settings, secrets, a test and the save. */
export function ConnectionForm({ type, connection }: { type: DatasourceType; connection?: Connection }) {
  const form = useConnectionForm({ type, connection });
  const [vaultDialog, setVaultDialog] = useState<'create' | 'unlock' | null>(null);
  const settingsFields = type.fields.filter((field) => !isSecret(field.kind));
  const secretFields = type.fields.filter((field) => isSecret(field.kind));
  const isLocked = form.vaultStatus === 'locked';

  const handleSubmit = () => {
    if (form.vaultStep) setVaultDialog(form.vaultStep);
    else form.save();
  };

  const handleDelete = () =>
    modals.openConfirmModal({
      title: `Delete ${connection?.name ?? 'this connection'}?`,
      children: (
        <Text size="sm">
          Its secrets go too. Widgets that query it show an error until a connection has its id again.
        </Text>
      ),
      labels: { confirm: 'Delete connection', cancel: 'Keep it' },
      confirmProps: { color: 'danger' },
      onConfirm: form.remove,
    });

  return (
    <form
      className={classes.form}
      aria-busy={form.isSaving}
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <Section title="Connection">
        <SectionRow label="Name" labelId="connection-name">
          <TextInput
            aria-labelledby="connection-name"
            value={form.name}
            onChange={(event) => form.setName(event.currentTarget.value)}
            error={form.errors.name}
            data-autofocus
          />
        </SectionRow>
        <SectionRow
          label="Id"
          labelId="connection-id"
          description={
            form.isNew
              ? 'What queries name, e.g. { "datasource": "sales-db" }. It can’t change once saved.'
              : 'What queries name. It can’t change.'
          }
        >
          <TextInput
            aria-labelledby="connection-id"
            value={form.id}
            disabled={!form.isNew}
            onChange={(event) => form.setId(event.currentTarget.value)}
            error={form.errors.id}
          />
        </SectionRow>
      </Section>

      {settingsFields.length > 0 ? (
        <Section title="Settings" description="Stored in this browser as they are: nothing here is secret.">
          {settingsFields.map((field) => (
            <FieldRow
              key={field.name}
              field={field}
              value={form.settings[field.name] ?? ''}
              error={form.errors[field.name]}
              onChange={(value) => form.setSetting(field.name, value)}
            />
          ))}
        </Section>
      ) : null}

      <Section title="Secrets" description="Never in dashboards, exports, links or logs.">
        <SecretsNotice
          status={form.vaultStatus}
          isNew={form.isNew}
          onUnlock={() => setVaultDialog('unlock')}
        />
        {secretFields.map((field) => (
          <FieldRow
            key={field.name}
            field={field}
            value={form.secrets[field.name] ?? ''}
            error={form.errors[field.name]}
            isSaved={form.hasSavedSecrets}
            isDisabled={isLocked}
            onChange={(value) => form.setSecret(field.name, value)}
          />
        ))}
        <SectionRow
          label="Keep"
          labelId="connection-keep"
          description="Saved on this device, they're encrypted with your passphrase and unlocked once after each reload. Otherwise they last until you close this tab."
        >
          <Checkbox
            label="Save on this device"
            checked={form.shouldSaveOnDevice}
            disabled={isLocked}
            onChange={(event) => form.setSaveOnDevice(event.currentTarget.checked)}
          />
        </SectionRow>
      </Section>

      {form.testResult.status === 'passed' ? (
        <Alert
          color="success"
          icon={<IconCircleCheck size={iconSize.sm} stroke={iconStroke} />}
          title="Connected"
        >
          {form.testResult.message}
        </Alert>
      ) : form.testResult.status === 'failed' ? (
        <Alert
          color="danger"
          icon={<IconAlertTriangle size={iconSize.sm} stroke={iconStroke} />}
          title="The test failed"
        >
          {form.testResult.message}
        </Alert>
      ) : null}

      <div className={classes.actions}>
        {connection ? (
          <Button variant="subtle" color="danger" onClick={handleDelete} loading={form.isDeleting}>
            Delete
          </Button>
        ) : null}
        <Group gap="xs" className={classes.end}>
          <Button
            variant="default"
            onClick={form.runTest}
            loading={form.testResult.status === 'testing'}
            disabled={isLocked}
          >
            Test connection
          </Button>
          <Button type="submit" loading={form.isSaving} disabled={isLocked}>
            Save
          </Button>
        </Group>
      </div>

      <QueryExample id={form.id} example={type.example} />

      <CreateVaultDialog
        opened={vaultDialog === 'create'}
        onClose={() => setVaultDialog(null)}
        onCreated={() => {
          setVaultDialog(null);
          form.save();
        }}
      />
      <UnlockVaultDialog
        opened={vaultDialog === 'unlock'}
        onClose={() => setVaultDialog(null)}
        onUnlocked={() => setVaultDialog(null)}
      />
    </form>
  );
}

function SecretsNotice({
  status,
  isNew,
  onUnlock,
}: {
  status: string;
  isNew: boolean;
  onUnlock: () => void;
}) {
  if (isNew) return null;
  if (status === 'locked')
    return (
      <div className={classes.notice}>
        <Alert color="warning" icon={<IconLock size={iconSize.sm} stroke={iconStroke} />} title="Locked">
          <Text size="sm">
            These secrets are saved on this device. Unlock them to test or change the connection.
          </Text>
          <Button mt="sm" size="xs" variant="default" onClick={onUnlock}>
            Unlock saved secrets
          </Button>
        </Alert>
      </div>
    );
  if (status === 'changed')
    return (
      <div className={classes.notice}>
        <Alert
          color="danger"
          icon={<IconAlertTriangle size={iconSize.sm} stroke={iconStroke} />}
          title="Changed outside the app"
        >
          These settings changed since the secrets were saved, so the secrets won't be used. Check every
          setting above, then enter the secrets again.
        </Alert>
      </div>
    );
  if (status === 'missing')
    return (
      <div className={classes.notice}>
        <Alert color="info" title="Enter the secrets">
          They were kept for a session that has ended, or never entered.
        </Alert>
      </div>
    );
  return null;
}

/** One field as a form row, the input matching its kind. */
function FieldRow({
  field,
  value,
  error,
  isSaved = false,
  isDisabled = false,
  onChange,
}: {
  field: ConnectionField;
  value: string;
  error?: string;
  isSaved?: boolean;
  isDisabled?: boolean;
  onChange: (value: string) => void;
}) {
  const labelId = useId();
  const [file, setFile] = useState<File | null>(null);
  const savedHint = isSaved ? 'Saved; leave blank to keep it' : undefined;
  const common = {
    'aria-labelledby': labelId,
    error,
    disabled: isDisabled,
    required: field.isRequired,
  };
  return (
    <SectionRow label={field.label} labelId={labelId} description={field.description}>
      {field.kind === 'select' ? (
        <Select
          {...common}
          data={field.options ?? []}
          value={value || null}
          onChange={(next) => onChange(next ?? '')}
          allowDeselect={false}
        />
      ) : field.kind === 'secret' ? (
        <PasswordInput
          {...common}
          autoComplete="off"
          placeholder={savedHint ?? field.placeholder}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      ) : field.kind === 'secretFile' ? (
        <FileInput
          {...common}
          accept={field.accept}
          clearable
          leftSection={<IconUpload size={iconSize.sm} stroke={iconStroke} />}
          placeholder={savedHint ?? 'Choose a file'}
          value={file}
          onChange={(next) => {
            setFile(next);
            if (!next) onChange('');
            else void next.text().then(onChange);
          }}
        />
      ) : (
        <TextInput
          {...common}
          type={field.kind === 'url' ? 'url' : 'text'}
          placeholder={field.placeholder}
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
        />
      )}
    </SectionRow>
  );
}
