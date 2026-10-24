import { IconBrandAzure } from '@tabler/icons-react';
import { z } from 'zod';
import { maxRowsSchema } from '@/core/data/maxRows';
import { defineDatasourceType, defineOptionalPlugin } from '@/plugins/OptionalPlugin';
import { relayFields, relayTokenSchema, relayUrlSchema } from '../relay/relayFields';

/**
 * Azure SQL Database and SQL Server, through the relay: browsers can't open their connections. In
 * the build only when plugins.json lists `azure-sql`. Use a login that can only read (`db_datareader`).
 */

export const azureSqlSettingsSchema = z.object({ relayUrl: relayUrlSchema });

export const azureSqlSecretsSchema = z.object({
  relayToken: relayTokenSchema,
  connectionString: z
    .string()
    .trim()
    .regex(
      /(?:^|;)\s*(?:server|data source|address|addr|network address)\s*=/i,
      'Paste an ADO.NET connection string, starting Server=tcp:….database.windows.net,1433;',
    ),
});

export const azureSqlSpecSchema = z.object({ sql: z.string().min(1), maxRows: maxRowsSchema });

export type AzureSqlSettings = z.infer<typeof azureSqlSettingsSchema>;
export type AzureSqlSecrets = z.infer<typeof azureSqlSecretsSchema>;

const azureSql = defineDatasourceType({
  type: 'azure-sql',
  name: 'Azure SQL',
  description: 'Azure SQL Database or SQL Server, through the relay. Free databases pause when idle.',
  icon: IconBrandAzure,
  fields: [
    ...relayFields,
    {
      name: 'connectionString',
      label: 'Connection string',
      kind: 'secret',
      isRequired: true,
      placeholder: 'Server=tcp:….database.windows.net,1433;Initial Catalog=…;User ID=…;Password=…;',
      description: 'The ADO.NET string from the portal’s Connection strings page, with a read-only login.',
    },
  ],
  settingsSchema: azureSqlSettingsSchema,
  secretsSchema: azureSqlSecretsSchema,
  querySchema: azureSqlSpecSchema,
  example: {
    sql: 'SELECT CAST(created_at AS date) AS day, COUNT(*) AS orders FROM orders WHERE created_at BETWEEN $__from AND $__to GROUP BY CAST(created_at AS date) ORDER BY day',
  },
  isTimeAware: true,
  load: () => import('./azureSqlRuntime').then((m) => m.azureSqlRuntime),
});

export const azureSqlPlugin = defineOptionalPlugin('azure-sql', [azureSql]);
