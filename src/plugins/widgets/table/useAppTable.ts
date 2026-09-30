import {
  columnSizingFeature,
  columnVisibilityFeature,
  createSortedRowModel,
  createTableHook,
  rowSortingFeature,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
} from '@tanstack/react-table';

/**
 * The one table setup for the app: TanStack Table v9 with only the features we use (each is
 * tree-shaken otherwise), rendered with Mantine `Table`. Add filtering or grouping here when a
 * table needs it. `basic` sorts numbers and times, `text` sorts strings.
 */
export const appTableFeatures = tableFeatures({
  rowSortingFeature,
  columnVisibilityFeature,
  columnSizingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { basic: sortFn_basic, text: sortFn_text },
});

export const { useAppTable, createAppColumnHelper } = createTableHook({ features: appTableFeatures });
