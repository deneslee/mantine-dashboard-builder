import { createContext } from 'react';
import type { DashboardStore } from './createDashboardStore';
export const DashboardContext = createContext<DashboardStore | null>(null);
