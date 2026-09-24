import { createFileRoute } from '@tanstack/react-router';
import { Placeholder } from './-placeholder';

export const Route = createFileRoute('/datasources')({
  component: () => (
    <Placeholder
      title="Data sources"
      description="Connect JSON, CSV, Azure SQL, Datadog, AWS and Haystack. Local JSON arrives in phase 2."
    />
  ),
});
