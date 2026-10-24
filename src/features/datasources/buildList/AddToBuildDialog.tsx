import {
  Alert,
  Anchor,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import { canonicalJson } from '@/core/data/canonicalJson';
import { toAppError } from '@/core/errors/AppError';
import { useVaultActions, useVaultEntryStatus, useVaultStatus } from '@/lib/vault/useVault';
import type { PluginCatalogEntry } from '@/plugins/OptionalPlugin';
import { usePlugins } from '@/plugins/usePlugins';
import { iconSize, iconStroke } from '@/ui/tokens/semantic';
import { REPOSITORY, defaultBuildTarget, saveBuildTarget, type BuildTarget } from './buildTarget';
import { POLL_MS, commitBuildList, waitForBuild, type BuildCommit } from './githubBuildList';

/** The vault entry for the GitHub token, saved for the repository and branch it was typed for. */
export const GITHUB_VAULT_KEY = 'github';
const NEW_TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new';

type Step =
  | { status: 'form' }
  | { status: 'committing' }
  | { status: 'waiting'; result: BuildCommit }
  | { status: 'live' }
  | { status: 'failed'; message: string; result?: BuildCommit };

type Errors = Partial<Record<'repository' | 'branch' | 'token', string>>;

/**
 * Add to build (or Remove) on the live site: commits `plugins.json` to the site's repository with
 * the user's GitHub token, then waits until the build with the new list is live and offers Reload.
 */
export function AddToBuildDialog({
  entry,
  opened,
  onClose,
  commit = commitBuildList,
  waitForLive = waitForBuild,
}: {
  entry: PluginCatalogEntry;
  opened: boolean;
  onClose: () => void;
  /** GitHub and the polling; stories pass fakes. */
  commit?: typeof commitBuildList;
  waitForLive?: typeof waitForBuild;
}) {
  const { build } = usePlugins();
  const vault = useVaultActions();
  const { hasVault, isLocked } = useVaultStatus();
  const [target, setTarget] = useState<BuildTarget>(() => defaultBuildTarget(build));
  const [token, setToken] = useState('');
  const [shouldSaveToken, setSaveToken] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [step, setStep] = useState<Step>({ status: 'form' });
  const running = useRef<AbortController | null>(null);
  const hasSavedToken = useVaultEntryStatus(GITHUB_VAULT_KEY, canonicalJson(target)) === 'ready';
  const canSaveToken = hasVault && !isLocked;
  const isAdding = !entry.isInBuild;

  // Nothing keeps polling once the dialog is gone.
  useEffect(() => () => running.current?.abort(), []);

  const handleClose = () => {
    running.current?.abort();
    setStep({ status: 'form' });
    setToken('');
    onClose();
  };

  const handleSubmit = async () => {
    const checked = { repository: target.repository.trim(), branch: target.branch.trim() };
    const saved = vault.lookup(GITHUB_VAULT_KEY, canonicalJson(checked));
    const useToken = token.trim() || (saved.status === 'ready' ? (saved.secrets.token ?? '') : '');
    const next: Errors = {};
    if (!REPOSITORY.test(checked.repository))
      next.repository = 'owner/name, e.g. deneslee/mantine-dashboard-builder.';
    if (!checked.branch) next.branch = 'Name the branch the site deploys from.';
    if (!useToken) next.token = 'Paste a token.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    running.current?.abort();
    const controller = new AbortController();
    running.current = controller;
    setStep({ status: 'committing' });
    let result: BuildCommit | undefined;
    try {
      if (token.trim())
        await vault.set(GITHUB_VAULT_KEY, {
          secrets: { token: token.trim() },
          fingerprint: canonicalJson(checked),
          isSaved: shouldSaveToken && canSaveToken,
        });
      saveBuildTarget(checked);
      result = await commit({
        target: checked,
        token: useToken,
        change: { id: entry.id, isAdded: isAdding },
        order: build.catalog.map((plugin) => plugin.id),
        signal: controller.signal,
      });
      setStep({ status: 'waiting', result });
      await waitForLive(
        { commit: result.commit?.sha, plugins: result.plugins },
        { signal: controller.signal },
      );
      setStep({ status: 'live' });
    } catch (error) {
      if (controller.signal.aborted) return;
      setStep({ status: 'failed', message: toAppError(error).message, result });
    }
  };

  const title = isAdding ? `Add ${entry.name} to the build` : `Remove ${entry.name} from the build`;

  return (
    <Modal opened={opened} onClose={handleClose} title={title} centered>
      {step.status === 'form' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          <Stack>
            <Text size="sm">
              This commits plugins.json {isAdding ? 'with' : 'without'} {entry.name} to the site’s repository.
              Its deploy then builds the site again, which takes a few minutes; this page checks for it.
            </Text>
            <TextInput
              data-autofocus={target.repository ? undefined : true}
              label="Repository"
              placeholder="owner/name"
              value={target.repository}
              onChange={(event) => setTarget({ ...target, repository: event.currentTarget.value })}
              error={errors.repository}
            />
            <TextInput
              label="Branch"
              description="The one the site deploys from."
              value={target.branch}
              onChange={(event) => setTarget({ ...target, branch: event.currentTarget.value })}
              error={errors.branch}
            />
            <PasswordInput
              data-autofocus={target.repository ? true : undefined}
              label="GitHub token"
              autoComplete="off"
              description={
                <>
                  A{' '}
                  <Anchor href={NEW_TOKEN_URL} target="_blank" rel="noreferrer" inherit underline="always">
                    fine-grained token
                  </Anchor>{' '}
                  for this repository only, with Contents: read and write.
                  {hasSavedToken ? ' One is saved: leave this blank to use it.' : ''}
                </>
              }
              value={token}
              onChange={(event) => setToken(event.currentTarget.value)}
              error={errors.token}
            />
            <Checkbox
              label="Save the token on this device"
              description={
                canSaveToken
                  ? 'Encrypted with your passphrase, like saved connections.'
                  : 'Needs unlocked saved secrets. Without them, it lasts until you close this tab.'
              }
              checked={shouldSaveToken && canSaveToken}
              disabled={!canSaveToken}
              onChange={(event) => setSaveToken(event.currentTarget.checked)}
            />
            <Group justify="flex-end" gap="xs">
              <Button variant="default" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit">{isAdding ? 'Commit and build' : 'Commit and rebuild'}</Button>
            </Group>
          </Stack>
        </form>
      ) : step.status === 'committing' ? (
        <Group gap="sm" role="status">
          <Loader size="sm" />
          <Text size="sm">Committing plugins.json to {target.repository}…</Text>
        </Group>
      ) : step.status === 'waiting' ? (
        <Stack>
          <Group gap="sm" role="status">
            <Loader size="sm" />
            <Text size="sm">Waiting for the new build…</Text>
          </Group>
          <Text size="sm" c="dimmed">
            {step.result.commit ? (
              <>
                The deploy is building{' '}
                <Anchor
                  href={step.result.commit.url}
                  target="_blank"
                  rel="noreferrer"
                  inherit
                  underline="always"
                >
                  commit {step.result.commit.sha.slice(0, 7)}
                </Anchor>
                .
              </>
            ) : (
              <>plugins.json already lists it, so a build with it is on its way.</>
            )}{' '}
            This page checks every {POLL_MS / 1000} seconds; it usually takes a few minutes.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={handleClose}>
              Close
            </Button>
          </Group>
        </Stack>
      ) : step.status === 'live' ? (
        <Stack>
          <Alert
            color="success"
            icon={<IconCircleCheck size={iconSize.sm} stroke={iconStroke} />}
            title="The new build is live"
          >
            Reload to {isAdding ? `use ${entry.name}` : `finish removing ${entry.name}`}.
          </Alert>
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={handleClose}>
              Close
            </Button>
            <Button onClick={() => window.location.reload()}>Reload</Button>
          </Group>
        </Stack>
      ) : (
        <Stack>
          <Alert
            color="danger"
            icon={<IconAlertTriangle size={iconSize.sm} stroke={iconStroke} />}
            title={step.result ? 'No new build yet' : 'The build list didn’t change'}
          >
            {step.message}
            {step.result?.commit ? (
              <>
                {' '}
                <Anchor
                  href={step.result.commit.url}
                  target="_blank"
                  rel="noreferrer"
                  inherit
                  underline="always"
                >
                  See the commit
                </Anchor>
              </>
            ) : null}
          </Alert>
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={handleClose}>
              Close
            </Button>
            <Button onClick={() => setStep({ status: 'form' })}>Try again</Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
