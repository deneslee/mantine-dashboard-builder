import type { ComponentType } from 'react';

export type IntegrationStatus = 'connected' | 'not_configured';

export interface IntegrationDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  status: IntegrationStatus;
  to: string;
  features: string[];
  icon: ComponentType<{ size?: number | string }>;
}
