import { IconBrandMongodb } from '@tabler/icons-react';
import { z } from 'zod';
import { maxRowsSchema } from '@/core/data/maxRows';
import { findDeniedMongoOperator } from '@/core/relay/mongoOperators';
import { defineDatasourceType, defineOptionalPlugin } from '@/plugins/OptionalPlugin';
import { relayFields, relayTokenSchema, relayUrlSchema } from '../relay/relayFields';

/**
 * MongoDB and Atlas, through the relay: browsers can't speak MongoDB's protocol, and Atlas's Data
 * API is gone. In the build only when plugins.json lists `mongodb`. Use a user with the `read` role.
 */

const optionalText = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

export const mongodbSettingsSchema = z.object({
  relayUrl: relayUrlSchema,
  /** Queries use it unless they name their own. */
  database: optionalText,
});

export const mongodbSecretsSchema = z.object({
  relayToken: relayTokenSchema,
  connectionString: z
    .string()
    .trim()
    .regex(/^mongodb(\+srv)?:\/\//, 'A MongoDB connection string starts with mongodb:// or mongodb+srv://.'),
});

export const mongodbSpecSchema = z.object({
  database: z.string().min(1).optional(),
  collection: z.string().min(1),
  /** An aggregation pipeline. `"$__from"` and the other macros may stand for any value in it. */
  pipeline: z
    .array(z.record(z.string(), z.unknown()))
    .refine((pipeline) => !findDeniedMongoOperator(pipeline), {
      message: 'Pipelines only read: no $out, $merge, $function, $accumulator or $where.',
    }),
  maxRows: maxRowsSchema,
});

export type MongodbSettings = z.infer<typeof mongodbSettingsSchema>;
export type MongodbSecrets = z.infer<typeof mongodbSecretsSchema>;

const mongodb = defineDatasourceType({
  type: 'mongodb',
  name: 'MongoDB',
  description: 'MongoDB or Atlas aggregation pipelines, through the relay. Atlas’s M0 tier is free.',
  icon: IconBrandMongodb,
  fields: [
    ...relayFields,
    {
      name: 'connectionString',
      label: 'Connection string',
      kind: 'secret',
      isRequired: true,
      placeholder: 'mongodb+srv://reader:…@cluster0.….mongodb.net/',
      description: 'From Atlas › Connect › Drivers, for a database user with the read role.',
    },
    { name: 'database', label: 'Database', kind: 'text', placeholder: 'sample_analytics' },
  ],
  settingsSchema: mongodbSettingsSchema,
  secretsSchema: mongodbSecretsSchema,
  querySchema: mongodbSpecSchema,
  example: {
    collection: 'orders',
    pipeline: [
      { $match: { createdAt: { $gte: '$__from', $lt: '$__to' } } },
      { $group: { _id: { $dateTrunc: { date: '$createdAt', unit: 'day' } }, orders: { $sum: 1 } } },
      { $project: { _id: 0, day: '$_id', orders: 1 } },
      { $sort: { day: 1 } },
    ],
  },
  isTimeAware: true,
  load: () => import('./mongodbRuntime').then((m) => m.mongodbRuntime),
});

export const mongodbPlugin = defineOptionalPlugin('mongodb', [mongodb]);
