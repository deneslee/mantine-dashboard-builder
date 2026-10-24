import { IconBrandFirebase, IconBrandGoogleBigQuery } from '@tabler/icons-react';
import { z } from 'zod';
import { maxRowsSchema } from '@/core/data/maxRows';
import { defineDatasourceType, defineOptionalPlugin, type ConnectionField } from '@/plugins/OptionalPlugin';

/**
 * Google Cloud: BigQuery and Firestore, called straight from the browser (their APIs allow it). It
 * needs no SDK: a service-account key is signed with WebCrypto and exchanged for a token, or the
 * user pastes an access token. In the build only when plugins.json lists `google`.
 */

/** The parts of a service-account key file the plugin uses. */
export const serviceAccountKeySchema = z.object({
  client_email: z.email(),
  private_key: z.string().includes('PRIVATE KEY'),
  private_key_id: z.string().optional(),
  project_id: z.string().optional(),
});

/** A field that may be left empty: blank reads as absent. */
const optionalText = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

export const googleSecretsSchema = z
  .object({
    /** A service-account key file's JSON. */
    serviceAccountKey: optionalText,
    /** An OAuth access token, e.g. from `gcloud auth print-access-token`; it expires within an hour. */
    accessToken: optionalText,
  })
  .superRefine((secrets, ctx) => {
    if (!secrets.serviceAccountKey && !secrets.accessToken)
      ctx.addIssue({
        code: 'custom',
        path: ['serviceAccountKey'],
        message: 'Add a service-account key or an access token.',
      });
    if (secrets.serviceAccountKey) {
      let json: unknown;
      try {
        json = JSON.parse(secrets.serviceAccountKey);
      } catch {
        json = null;
      }
      if (!serviceAccountKeySchema.safeParse(json).success)
        ctx.addIssue({
          code: 'custom',
          path: ['serviceAccountKey'],
          message: "That isn't a service-account key file (it needs client_email and private_key).",
        });
    }
  });

export type GoogleSecrets = z.infer<typeof googleSecretsSchema>;

const projectId = z
  .string()
  .trim()
  .regex(/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/, 'A Google Cloud project id, e.g. my-dashboards-123.');

export const bigquerySettingsSchema = z.object({
  projectId,
  /** Where the datasets live, e.g. `US` or `europe-west1`; Google finds it when it's left out. */
  location: optionalText,
  /** A cost guard: queries that would bill more bytes fail instead of running. */
  maximumBytesBilled: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value),
    z.coerce.number().int().positive().optional(),
  ),
});

export const firestoreSettingsSchema = z.object({
  projectId,
  databaseId: optionalText.transform((value) => value ?? '(default)'),
});

export type BigQuerySettings = z.infer<typeof bigquerySettingsSchema>;
export type FirestoreSettings = z.infer<typeof firestoreSettingsSchema>;

export const bigquerySpecSchema = z.object({ sql: z.string().min(1), maxRows: maxRowsSchema });

export const firestoreSpecSchema = z.object({
  /** A Firestore structured query; values that are exactly "$__from" or "$__to" become timestamps. */
  structuredQuery: z.object({ from: z.array(z.object({ collectionId: z.string() }).loose()).min(1) }).loose(),
  /** A document path for subcollections, e.g. `users/alice`. */
  parent: z
    .string()
    .regex(/^[^/]+(\/[^/]+)*$/, 'A document path, e.g. users/alice.')
    .optional(),
  maxRows: maxRowsSchema,
});

const authFields: ConnectionField[] = [
  {
    name: 'serviceAccountKey',
    label: 'Service-account key',
    kind: 'secretFile',
    accept: 'application/json,.json',
    description:
      'The JSON key of a service account with read access, e.g. BigQuery Data Viewer and Job User. Or leave it out and paste an access token.',
  },
  {
    name: 'accessToken',
    label: 'Access token',
    kind: 'secret',
    description: 'Instead of a key: `gcloud auth print-access-token`. It expires within an hour.',
  },
];

const projectField: ConnectionField = {
  name: 'projectId',
  label: 'Project id',
  kind: 'text',
  isRequired: true,
  placeholder: 'my-dashboards-123',
};

const bigquery = defineDatasourceType({
  type: 'bigquery',
  name: 'BigQuery',
  description: 'Google BigQuery: standard SQL over your datasets. The sandbox is free, no card needed.',
  icon: IconBrandGoogleBigQuery,
  fields: [
    { ...projectField, description: 'The project that runs, and is billed for, the queries.' },
    {
      name: 'location',
      label: 'Location',
      kind: 'text',
      placeholder: 'US',
      description: 'Where the datasets are, e.g. US or europe-west1.',
    },
    {
      name: 'maximumBytesBilled',
      label: 'Maximum bytes billed',
      kind: 'text',
      placeholder: '1000000000',
      description: 'A query that would scan more fails instead of running.',
    },
    ...authFields,
  ],
  settingsSchema: bigquerySettingsSchema,
  secretsSchema: googleSecretsSchema,
  querySchema: bigquerySpecSchema,
  example: {
    sql: 'SELECT DATE(created_at) AS day, COUNT(*) AS orders FROM `my-dashboards-123.shop.orders` WHERE created_at BETWEEN $__from AND $__to GROUP BY day ORDER BY day',
  },
  isTimeAware: true,
  load: () => import('./bigqueryRuntime').then((m) => m.bigqueryRuntime),
});

const firestore = defineDatasourceType({
  type: 'firestore',
  name: 'Firestore',
  description:
    'Google Cloud Firestore: structured queries over a collection. The free quota covers small apps.',
  icon: IconBrandFirebase,
  fields: [
    projectField,
    { name: 'databaseId', label: 'Database', kind: 'text', placeholder: '(default)' },
    ...authFields.map((field) =>
      field.name === 'serviceAccountKey'
        ? { ...field, description: 'The JSON key of a service account with the Cloud Datastore Viewer role.' }
        : field,
    ),
  ],
  settingsSchema: firestoreSettingsSchema,
  secretsSchema: googleSecretsSchema,
  querySchema: firestoreSpecSchema,
  example: {
    structuredQuery: {
      from: [{ collectionId: 'orders' }],
      where: {
        fieldFilter: { field: { fieldPath: 'createdAt' }, op: 'GREATER_THAN_OR_EQUAL', value: '$__from' },
      },
      orderBy: [{ field: { fieldPath: 'createdAt' }, direction: 'ASCENDING' }],
      limit: 500,
    },
  },
  isTimeAware: true,
  load: () => import('./firestoreRuntime').then((m) => m.firestoreRuntime),
});

export const googlePlugin = defineOptionalPlugin('google', [bigquery, firestore]);
