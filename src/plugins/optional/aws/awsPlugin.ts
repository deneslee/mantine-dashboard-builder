import { IconBrandAws, IconDatabase, IconSql, IconTable } from '@tabler/icons-react';
import { z } from 'zod';
import { maxRowsSchema } from '@/core/data/maxRows';
import { defineDatasourceType, defineOptionalPlugin, type ConnectionField } from '@/plugins/OptionalPlugin';

/**
 * AWS: Athena, Aurora (RDS Data API), Redshift (Data API) and DynamoDB, called straight from the
 * browser with the AWS SDK; each type's client is its own chunk. In the build only when plugins.json
 * lists `aws`. Use an IAM user or role that can only read (the docs list a policy per type), and
 * prefer temporary credentials.
 */

/** A field that may be left empty: blank reads as absent. */
const optionalText = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

export const awsSecretsSchema = z.object({
  accessKeyId: z
    .string()
    .trim()
    .regex(
      /^(AKIA|ASIA)[A-Z0-9]{16}$/,
      'An access key id starts with AKIA or ASIA, then 16 letters and digits.',
    ),
  secretAccessKey: z.string().trim().min(16, 'Paste the secret access key.'),
  /** With temporary credentials (an ASIA… key). */
  sessionToken: optionalText,
});

export type AwsSecrets = z.infer<typeof awsSecretsSchema>;

const region = z
  .string()
  .trim()
  .regex(/^[a-z]{2}(-gov|-iso[a-z]*)?-[a-z]+-\d$/, 'A region, e.g. eu-west-1.');

const arn = (service: string, example: string) =>
  z
    .string()
    .trim()
    .regex(new RegExp(`^arn:aws[a-z-]*:${service}:`), `An ARN, e.g. ${example}.`);

export const athenaSettingsSchema = z.object({
  region,
  workgroup: optionalText.transform((value) => value ?? 'primary'),
  /** Where Athena writes results; optional when the workgroup sets one. */
  outputLocation: z
    .string()
    .trim()
    .regex(/^(s3:\/\/.+)?$/, 'An S3 location, e.g. s3://my-athena-results/.')
    .transform((value) => value || undefined)
    .optional(),
  catalog: optionalText.transform((value) => value ?? 'AwsDataCatalog'),
  database: optionalText,
});

export const auroraSettingsSchema = z.object({
  region,
  resourceArn: arn('rds', 'arn:aws:rds:eu-west-1:123456789012:cluster:shop'),
  secretArn: arn('secretsmanager', 'arn:aws:secretsmanager:eu-west-1:123456789012:secret:shop-reader'),
  database: optionalText,
});

export const redshiftSettingsSchema = z
  .object({
    region,
    /** Redshift Serverless. */
    workgroupName: optionalText,
    /** A provisioned cluster. */
    clusterIdentifier: optionalText,
    database: z.string().trim().min(1, 'Name the database, e.g. dev.'),
    dbUser: optionalText,
    secretArn: optionalText,
  })
  .refine((settings) => Boolean(settings.workgroupName) !== Boolean(settings.clusterIdentifier), {
    path: ['workgroupName'],
    message: 'Give a Serverless workgroup or a cluster, not both.',
  });

export const dynamodbSettingsSchema = z.object({ region });

export type AthenaSettings = z.infer<typeof athenaSettingsSchema>;
export type AuroraSettings = z.infer<typeof auroraSettingsSchema>;
export type RedshiftSettings = z.infer<typeof redshiftSettingsSchema>;
export type DynamoDbSettings = z.infer<typeof dynamodbSettingsSchema>;

export const sqlSpecSchema = z.object({ sql: z.string().min(1), maxRows: maxRowsSchema });

export const dynamodbSpecSchema = z.object({
  /** A PartiQL SELECT; DynamoDB's PartiQL can also write, so anything else is refused. */
  statement: z
    .string()
    .trim()
    .regex(/^select\s/i, 'Only SELECT statements: this datasource reads.'),
  /** Fields holding times (ISO strings or epoch milliseconds), read as times. */
  timeFields: z.array(z.string()).optional(),
  maxRows: maxRowsSchema,
});

const regionField: ConnectionField = {
  name: 'region',
  label: 'Region',
  kind: 'text',
  isRequired: true,
  placeholder: 'eu-west-1',
};

const credentialFields: ConnectionField[] = [
  { name: 'accessKeyId', label: 'Access key id', kind: 'secret', isRequired: true, placeholder: 'AKIA…' },
  { name: 'secretAccessKey', label: 'Secret access key', kind: 'secret', isRequired: true },
  {
    name: 'sessionToken',
    label: 'Session token',
    kind: 'secret',
    description: 'For temporary credentials (an ASIA… key), e.g. from aws sts get-session-token.',
  },
];

const athena = defineDatasourceType({
  type: 'athena',
  name: 'Amazon Athena',
  description: 'SQL over data in S3. Billed per data scanned, so small queries cost cents.',
  icon: IconBrandAws,
  fields: [
    regionField,
    { name: 'workgroup', label: 'Workgroup', kind: 'text', placeholder: 'primary' },
    {
      name: 'outputLocation',
      label: 'Results location',
      kind: 'text',
      placeholder: 's3://my-athena-results/',
      description: 'Where Athena writes results. Leave it out when the workgroup sets one.',
    },
    { name: 'catalog', label: 'Catalog', kind: 'text', placeholder: 'AwsDataCatalog' },
    { name: 'database', label: 'Database', kind: 'text', placeholder: 'default' },
    ...credentialFields,
  ],
  settingsSchema: athenaSettingsSchema,
  secretsSchema: awsSecretsSchema,
  querySchema: sqlSpecSchema,
  example: {
    sql: "SELECT date_trunc('day', created_at) AS day, count(*) AS orders FROM orders WHERE created_at BETWEEN $__from AND $__to GROUP BY 1 ORDER BY 1",
  },
  isTimeAware: true,
  load: () => import('./athenaRuntime').then((m) => m.athenaRuntime),
});

const aurora = defineDatasourceType({
  type: 'aurora',
  name: 'Amazon Aurora',
  description: 'Aurora PostgreSQL or MySQL through the RDS Data API (turn it on for the cluster).',
  icon: IconDatabase,
  fields: [
    regionField,
    {
      name: 'resourceArn',
      label: 'Cluster ARN',
      kind: 'text',
      isRequired: true,
      placeholder: 'arn:aws:rds:…:cluster:…',
    },
    {
      name: 'secretArn',
      label: 'Secret ARN',
      kind: 'text',
      isRequired: true,
      placeholder: 'arn:aws:secretsmanager:…',
      description:
        'The Secrets Manager secret with a read-only database user. Its ARN isn’t secret; its value stays in AWS.',
    },
    { name: 'database', label: 'Database', kind: 'text', placeholder: 'shop' },
    ...credentialFields,
  ],
  settingsSchema: auroraSettingsSchema,
  secretsSchema: awsSecretsSchema,
  querySchema: sqlSpecSchema,
  example: {
    sql: "SELECT date_trunc('day', created_at) AS day, count(*) AS orders FROM orders WHERE created_at BETWEEN $__from AND $__to GROUP BY 1 ORDER BY 1",
  },
  isTimeAware: true,
  load: () => import('./auroraRuntime').then((m) => m.auroraRuntime),
});

const redshift = defineDatasourceType({
  type: 'redshift',
  name: 'Amazon Redshift',
  description: 'Redshift Serverless or a cluster, through the Redshift Data API.',
  icon: IconSql,
  fields: [
    regionField,
    { name: 'workgroupName', label: 'Serverless workgroup', kind: 'text', placeholder: 'default-workgroup' },
    {
      name: 'clusterIdentifier',
      label: 'Cluster',
      kind: 'text',
      description: 'Instead of a workgroup, for a provisioned cluster.',
    },
    { name: 'database', label: 'Database', kind: 'text', isRequired: true, placeholder: 'dev' },
    {
      name: 'dbUser',
      label: 'Database user',
      kind: 'text',
      description: 'For a cluster with temporary credentials.',
    },
    {
      name: 'secretArn',
      label: 'Secret ARN',
      kind: 'text',
      description: 'A Secrets Manager secret with the database user, instead of IAM credentials.',
    },
    ...credentialFields,
  ],
  settingsSchema: redshiftSettingsSchema,
  secretsSchema: awsSecretsSchema,
  querySchema: sqlSpecSchema,
  example: {
    sql: "SELECT date_trunc('day', created_at) AS day, count(*) AS orders FROM orders WHERE created_at BETWEEN $__from AND $__to GROUP BY 1 ORDER BY 1",
  },
  isTimeAware: true,
  load: () => import('./redshiftRuntime').then((m) => m.redshiftRuntime),
});

const dynamodb = defineDatasourceType({
  type: 'dynamodb',
  name: 'Amazon DynamoDB',
  description: 'PartiQL SELECTs over a table. The always-free tier covers 25 GB.',
  icon: IconTable,
  fields: [regionField, ...credentialFields],
  settingsSchema: dynamodbSettingsSchema,
  secretsSchema: awsSecretsSchema,
  querySchema: dynamodbSpecSchema,
  example: {
    statement:
      'SELECT * FROM "orders" WHERE "customer" = \'alice\' AND "createdAt" BETWEEN $__from AND $__to',
    timeFields: ['createdAt'],
  },
  isTimeAware: true,
  load: () => import('./dynamodbRuntime').then((m) => m.dynamodbRuntime),
});

export const awsPlugin = defineOptionalPlugin('aws', [athena, aurora, redshift, dynamodb]);
