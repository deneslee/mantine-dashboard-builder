import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from './-placeholder';

export const Route = createFileRoute('/templates')({
  component: () => (
    <Placeholder title="Templates" description="Start a dashboard from a layout. Arrives in phase 4." />
  ),
});
