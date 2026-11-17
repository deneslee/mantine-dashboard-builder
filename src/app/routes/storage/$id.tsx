import { createFileRoute } from '@tanstack/react-router';
import { plugins } from '@/app/plugins';
import { storageCollections } from '@/app/storageCollections';
import { StoragePlacePage } from '@/features/storage/StoragePlacePage';

export const Route = createFileRoute('/storage/$id')({
  staticData: { crumb: (data) => (data as { name?: string } | undefined)?.name },
  loader: ({ params }) => ({ name: plugins.recordProviders[params.id]?.name ?? params.id }),
  component: PlaceRoute,
});

function PlaceRoute() {
  const { id } = Route.useParams();
  return <StoragePlacePage key={id} id={id} collections={storageCollections} />;
}
