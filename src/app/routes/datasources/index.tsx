import { createFileRoute } from '@tanstack/react-router';
import { DatasourcesPage } from '@/features/datasources/DatasourcesPage';

export const Route = createFileRoute('/datasources/')({
  component: DatasourcesPage,
});
