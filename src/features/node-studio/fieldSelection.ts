import { createContext } from 'react';
import type { FieldEndpoint } from './model/schema';

export const SelectFieldContext = createContext<((field: FieldEndpoint) => void) | null>(null);
