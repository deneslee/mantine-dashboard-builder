import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from './-PlaceholderPage';

export const Route = createFileRoute('/explore')({
  component: () => (
    <Placeholder title="Explore" description="Query a data source without building a dashboard." />
  ),
});
