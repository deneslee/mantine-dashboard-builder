import { Button } from '@mantine/core';
import { IconLock, IconLockOpen } from '@tabler/icons-react';
import { useState } from 'react';
import { useVaultActions, useVaultStatus } from '@/lib/vault/useVault';
import { iconSize, iconStroke } from '@/ui/tokens/semantic';
import { UnlockVaultDialog } from './UnlockVaultDialog';

/** Unlock or lock the secrets saved on this device; nothing when none are saved. */
export function VaultStatus() {
  const { hasVault, isLocked } = useVaultStatus();
  const { lock } = useVaultActions();
  const [isUnlockOpen, setUnlockOpen] = useState(false);
  if (!hasVault) return null;
  return isLocked ? (
    <>
      <Button
        variant="default"
        leftSection={<IconLock size={iconSize.sm} stroke={iconStroke} />}
        onClick={() => setUnlockOpen(true)}
      >
        Unlock saved secrets
      </Button>
      <UnlockVaultDialog
        opened={isUnlockOpen}
        onClose={() => setUnlockOpen(false)}
        onUnlocked={() => setUnlockOpen(false)}
      />
    </>
  ) : (
    <Button
      variant="default"
      leftSection={<IconLockOpen size={iconSize.sm} stroke={iconStroke} />}
      onClick={lock}
    >
      Lock saved secrets
    </Button>
  );
}
