import { createFileRoute } from '@tanstack/react-router';
import { PlaceholderPage } from './-PlaceholderPage';

export const Route = createFileRoute('/datasources')({
  component: () => (
    <PlaceholderPage
      title="Data sources"
      description="Connect JSON, CSV, Azure SQL, Datadog, AWS and Haystack. Local JSON arrives in phase 2."
    />
  ),
});
