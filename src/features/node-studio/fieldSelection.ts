import { createContext } from 'react';

export interface FieldSelection {
  tableId: string;
  fieldId: string;
}

export const FieldSelectionContext = createContext<{
  selection: FieldSelection | null;
  select: (field: FieldSelection) => void;
} | null>(null);
