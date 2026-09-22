import { createFileRoute } from '@tanstack/react-router';
import { DebugPage } from '@/features/debug';

/** Dev-only playground: fire every notification level, throw errors, show skeletons. */
export const Route = createFileRoute('/debug')({
  component: DebugPage,
});
