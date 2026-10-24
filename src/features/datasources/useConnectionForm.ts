import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import type { z } from 'zod';
import { AppError, toAppError } from '@/core/errors/AppError';
import {
  useIsVaultEntrySaved,
  useVaultActions,
  useVaultEntryStatus,
  useVaultStatus,
} from '@/lib/vault/useVault';
import { connectionFingerprint, connectionVaultKey } from '@/plugins/connectionDatasource';
import type { Connection, ConnectionValues, DatasourceType } from '@/plugins/OptionalPlugin';
import { usePlugins } from '@/plugins/usePlugins';
import { slugify } from '@/utils/slugify';
import { CONNECTION_ID } from './connections/createConnectionsStore';
import { useConnectionActions, useConnections } from './connections/useConnections';

/** What the vault has to do before secrets can be saved on this device. */
export type VaultStep = 'create' | 'unlock' | null;

export type TestResult =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'passed'; message: string }
  | { status: 'failed'; message: string };

const TEST_TIMEOUT_MS = 30_000;

/** Secret fields go to the vault; the others are the connection's settings. */
export const isSecret = (kind: string) => kind === 'secret' || kind === 'secretFile';

const asText = (value: unknown) => (value === undefined || value === null ? '' : String(value as string));

/** Zod issues as one message per form field (the first part of each path). */
function fieldErrors(issues: z.core.$ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = String(issue.path[0] ?? '');
    errors[field] ??= issue.message;
  }
  return errors;
}

/**
 * A connection's form as a draft: name, id, settings and secrets. Secrets typed here replace the
 * saved ones; left blank, the saved ones stay, unless the connection changed outside the app, when
 * every secret must be typed again (the old ones were saved for other settings). Saving writes the
 * connection and its vault entry; testing runs the type's `test` with the draft, unsaved.
 */
export function useConnectionForm({ type, connection }: { type: DatasourceType; connection?: Connection }) {
  const navigate = useNavigate();
  const plugins = usePlugins();
  const connections = useConnections();
  const actions = useConnectionActions();
  const vault = useVaultActions();
  const { hasVault, isLocked } = useVaultStatus();
  const isNew = !connection;
  const savedId = connection?.id ?? '';
  const vaultStatus = useVaultEntryStatus(
    connectionVaultKey(savedId),
    connection ? connectionFingerprint(connection) : '',
  );
  const isSaved = useIsVaultEntrySaved(connectionVaultKey(savedId));

  const [name, setName] = useState(connection?.name ?? '');
  const [typedId, setTypedId] = useState<string>();
  const [settings, setSettings] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      type.fields
        .filter((field) => !isSecret(field.kind))
        .map((field) => [field.name, asText(connection?.settings[field.name])]),
    ),
  );
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [shouldSaveOnDevice, setSaveOnDevice] = useState(isSaved);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [test, setTest] = useState<TestResult>({ status: 'idle' });

  const id = isNew ? (typedId ?? slugify(name)) : savedId;
  const hasSavedSecrets = vaultStatus === 'ready';

  /** The draft checked against the type, or null with the errors shown. */
  const validate = (): {
    draft: Omit<Connection, 'updatedAt'>;
    secrets: Record<string, string>;
    values: ConnectionValues;
  } | null => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Give the connection a name.';
    if (isNew) {
      if (!CONNECTION_ID.test(id)) next.id = 'Lowercase letters, digits and dashes, e.g. sales-db.';
      else if (Object.hasOwn(plugins.datasources, id)) next.id = `“${id}” is taken: pick another id.`;
      else if (connections.some((c) => c.id === id)) next.id = `A connection already has the id “${id}”.`;
    }
    const parsedSettings = type.settingsSchema.safeParse(settings);
    if (!parsedSettings.success) Object.assign(next, fieldErrors(parsedSettings.error.issues));
    const kept =
      hasSavedSecrets && connection
        ? vault.lookup(connectionVaultKey(savedId), connectionFingerprint(connection))
        : null;
    const merged = {
      ...(kept?.status === 'ready' ? kept.secrets : {}),
      ...Object.fromEntries(Object.entries(secrets).filter(([, value]) => value.trim() !== '')),
    };
    const parsedSecrets = type.secretsSchema.safeParse(merged);
    if (!parsedSecrets.success) Object.assign(next, fieldErrors(parsedSecrets.error.issues));
    setErrors(next);
    if (Object.keys(next).length > 0 || !parsedSettings.success || !parsedSecrets.success) return null;
    return {
      draft: { id, plugin: type.plugin, type: type.type, name: name.trim(), settings },
      secrets: merged,
      values: { settings: parsedSettings.data, secrets: parsedSecrets.data },
    };
  };

  const save = useMutation({
    mutationFn: async (checked: NonNullable<ReturnType<typeof validate>>) => {
      const stored = actions.save(checked.draft);
      await vault.set(connectionVaultKey(stored.id), {
        secrets: checked.secrets,
        fingerprint: connectionFingerprint(stored),
        isSaved: shouldSaveOnDevice,
      });
    },
    meta: { successMessage: 'Connection saved', source: 'Data sources' },
    onSuccess: () => void navigate({ to: '/datasources' }),
  });

  /** What the vault needs before saving on this device; null when it can save now. */
  const vaultStep: VaultStep = !shouldSaveOnDevice ? null : !hasVault ? 'create' : isLocked ? 'unlock' : null;

  const handleSave = () => {
    const checked = validate();
    if (checked) save.mutate(checked);
  };

  const handleTest = async () => {
    const checked = validate();
    if (!checked) return;
    setTest({ status: 'testing' });
    try {
      const runtime = await type.load();
      const message = await runtime.test(checked.values, AbortSignal.timeout(TEST_TIMEOUT_MS));
      setTest({ status: 'passed', message });
    } catch (error) {
      setTest({ status: 'failed', message: toAppError(error).message });
    }
  };

  const remove = useMutation({
    mutationFn: async () => {
      if (!connection) throw new AppError('validation', 'This connection was never saved.');
      await vault.remove(connectionVaultKey(connection.id));
      actions.remove(connection.id);
    },
    meta: { successMessage: 'Connection deleted', source: 'Data sources' },
    onSuccess: () => void navigate({ to: '/datasources' }),
  });

  return {
    isNew,
    id,
    name,
    settings,
    secrets,
    errors,
    testResult: test,
    vaultStatus,
    hasSavedSecrets,
    shouldSaveOnDevice,
    vaultStep,
    isSaving: save.isPending,
    isDeleting: remove.isPending,
    setName,
    setId: setTypedId,
    setSetting: (field: string, value: string) => setSettings((s) => ({ ...s, [field]: value })),
    setSecret: (field: string, value: string) => setSecrets((s) => ({ ...s, [field]: value })),
    setSaveOnDevice,
    save: handleSave,
    runTest: () => void handleTest(),
    remove: () => remove.mutate(),
  };
}
