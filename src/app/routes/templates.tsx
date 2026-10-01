import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderPage } from './-PlaceholderPage';

export const Route = createFileRoute('/templates')({
  component: () => (
    <PlaceholderPage title="Templates" description="Start a dashboard from a layout. Arrives in phase 4." />
  ),
});
