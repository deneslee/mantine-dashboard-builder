import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderPage } from './-PlaceholderPage';

export const Route = createFileRoute('/explore')({
  component: () => (
    <PlaceholderPage title="Explore" description="Query a data source without building a dashboard." />
  ),
});
