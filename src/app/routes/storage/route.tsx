import { createFileRoute } from '@tanstack/react-router';

/** Groups the storage routes, so a place's trail starts with "Storage". Renders its child. */
export const Route = createFileRoute('/storage')({
  staticData: { crumb: 'Storage' },
});
