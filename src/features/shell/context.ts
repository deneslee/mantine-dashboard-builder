import { createContext } from 'react';
import type { ShellStoreApi } from './store';

export const ShellContext = createContext<ShellStoreApi | null>(null);
