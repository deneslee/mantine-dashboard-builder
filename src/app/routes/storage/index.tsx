import { createFileRoute } from '@tanstack/react-router';
import { StoragePage } from '@/features/storage/StoragePage';

export const Route = createFileRoute('/storage/')({
  component: () => <StoragePage />,
});
