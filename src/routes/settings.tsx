import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from './-placeholder';

export const Route = createFileRoute('/settings')({
  component: () => <Placeholder title="Settings" description="Workspace, members and appearance." />,
});
