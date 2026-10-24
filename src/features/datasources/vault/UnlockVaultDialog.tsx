import { Anchor, Button, Group, Modal, PasswordInput, Stack, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useState } from 'react';
import { toAppError } from '@/core/errors/AppError';
import { useVaultActions } from '@/lib/vault/useVault';

/** Asks for the passphrase that opens the secrets saved on this device. */
export function UnlockVaultDialog({
  opened,
  onClose,
  onUnlocked,
}: {
  opened: boolean;
  onClose: () => void;
  onUnlocked: () => void;
}) {
  const { unlock, reset } = useVaultActions();
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string>();
  const [isUnlocking, setUnlocking] = useState(false);

  const handleSubmit = async () => {
    setUnlocking(true);
    try {
      await unlock(passphrase);
      setPassphrase('');
      setError(undefined);
      onUnlocked();
    } catch (err) {
      setError(toAppError(err).message);
    }
    setUnlocking(false);
  };

  const handleForgot = () =>
    modals.openConfirmModal({
      title: 'Delete the saved secrets?',
      children: (
        <Text size="sm">
          Without the passphrase they can't be opened. Your connections stay; you enter their secrets again.
        </Text>
      ),
      labels: { confirm: 'Delete saved secrets', cancel: 'Keep them' },
      confirmProps: { color: 'danger' },
      onConfirm: () => {
        reset();
        onClose();
      },
    });

  return (
    <Modal opened={opened} onClose={onClose} title="Unlock saved secrets" centered>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <Stack>
          <PasswordInput
            data-autofocus
            label="Passphrase"
            autoComplete="current-password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.currentTarget.value)}
            error={error}
          />
          <Group justify="space-between">
            <Anchor component="button" type="button" size="sm" onClick={handleForgot}>
              Forgot it?
            </Anchor>
            <Group gap="xs">
              <Button variant="default" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" loading={isUnlocking} disabled={!passphrase}>
                Unlock
              </Button>
            </Group>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
