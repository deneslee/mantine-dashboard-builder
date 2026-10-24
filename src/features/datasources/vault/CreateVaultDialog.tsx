import { Alert, Button, Group, Modal, PasswordInput, Stack, Text } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { useState } from 'react';
import { toAppError } from '@/core/errors/AppError';
import { useVaultActions } from '@/lib/vault/useVault';
import { iconSize, iconStroke } from '@/ui/tokens/semantic';

const MIN_LENGTH = 12;

/** Sets up the passphrase that encrypts secrets saved on this device. */
export function CreateVaultDialog({
  opened,
  onClose,
  onCreated,
}: {
  opened: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { create } = useVaultActions();
  const [passphrase, setPassphrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string>();
  const [isCreating, setCreating] = useState(false);

  const handleSubmit = async () => {
    if (passphrase.length < MIN_LENGTH)
      return setError(`Use at least ${MIN_LENGTH} characters, e.g. a few words.`);
    if (passphrase !== confirmation) return setError("The two passphrases don't match.");
    setCreating(true);
    try {
      await create(passphrase);
      setPassphrase('');
      setConfirmation('');
      setError(undefined);
      onCreated();
    } catch (err) {
      setError(toAppError(err).message);
    }
    setCreating(false);
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Save secrets on this device" centered>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <Stack>
          <Text size="sm">
            Saved secrets are encrypted with a passphrase. After a reload you unlock them once, and they stay
            unlocked until you close the tab or lock them.
          </Text>
          <PasswordInput
            data-autofocus
            label="Passphrase"
            autoComplete="new-password"
            value={passphrase}
            onChange={(event) => setPassphrase(event.currentTarget.value)}
            error={error && passphrase.length < MIN_LENGTH ? error : undefined}
          />
          <PasswordInput
            label="Repeat it"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.currentTarget.value)}
            error={error && passphrase.length >= MIN_LENGTH ? error : undefined}
          />
          <Alert color="warning" icon={<IconInfoCircle size={iconSize.sm} stroke={iconStroke} />}>
            There is no way to recover a forgotten passphrase: you would enter the secrets again.
          </Alert>
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={isCreating}>
              Save on this device
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
