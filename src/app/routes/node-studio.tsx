import { createFileRoute } from '@tanstack/react-router';
import { NodeStudioPage } from '@/features/node-studio/NodeStudioPage/NodeStudioPage';

export const Route = createFileRoute('/node-studio')({
  staticData: { crumb: 'Node Studio' },
  component: NodeStudioPage,
});
