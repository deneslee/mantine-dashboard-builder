import { createContext } from 'react';
import type { DashboardStore } from './store';
export const DashboardContext = createContext<DashboardStore | null>(null);
