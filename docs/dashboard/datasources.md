# Data sources

Where a dashboard's data comes from:

- **Built-in datasources:** `mock` and `local-json`.
- **Optional plugins**, which add datasource types (Athena, BigQuery, Azure SQL, …) and are in a build only when it's chosen.
- **Connections**, which a user creates on the Data sources page. A connection is a type plus its settings, and its secrets are kept in a passphrase vault.

The design and its decisions are in [11 Optional plugins](https://github.com/deneslee/mantine-dashboard-builder/blob/0e400dd/.agents/planning/plans/done/11-optional-plugins.md); how queries are cached and run is in [dashboard.md](dashboard.md).

## The plugins

| Plugin (`plugins.json` id) | Types                                                                         | Runs                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `azure-sql`                | Azure SQL (Azure SQL Database or SQL Server)                                  | Through the [relay](#relay): browsers can't open SQL Server connections                  |
| `mongodb`                  | MongoDB (aggregation pipelines, Atlas or self-hosted)                         | Through the relay: browsers can't speak MongoDB's protocol, and Atlas's Data API is gone |
| `aws`                      | Amazon Athena, Aurora (RDS Data API), Redshift (Data API), DynamoDB (PartiQL) | In the browser, with the AWS SDK; each type is its own chunk                             |
| `google`                   | BigQuery, Firestore                                                           | In the browser, over Google's REST APIs; a service-account key is signed with WebCrypto  |

A plugin's manifest is its name, form fields and zod schemas, and it is all that's in the main bundle. The code that talks to the service (SDK clients, signing, mapping) is a lazy chunk per type, fetched the first time a connection of that type is queried or tested.

## Choosing what's in the build

`plugins.json` at the repo root lists the plugins in the build, none by default: `{ "plugins": ["aws", "google"] }`.

- **What the build includes:** `plugins.config.ts` turns the file into `virtual:optional-plugins`, which imports only the listed plugins. The others never enter the module graph, so none of their code reaches `dist`. An unknown id fails the build and names the known ones.
- **In the dev server** (`vp run dev`): Data sources › Plugins › Add to build or Remove writes `plugins.json` and reloads the page. Commit the file, and every build has exactly that list.
- **On the live site:** Add to build commits `plugins.json` to the site's repository through GitHub's API, and the site's deploy builds it again.
  - **Token:** create a [fine-grained token](https://github.com/settings/personal-access-tokens/new) for that repository only, with Contents: read and write.
  - **Repository and branch:** the dialog fills them in when CI built the site (`GITHUB_REPOSITORY`, `GITHUB_REF_NAME`), and otherwise remembers the last ones on this device.
  - **Afterwards:** it checks `build-info.json` every 15 seconds for up to 20 minutes, then offers Reload.
  - **Hosts:** it works with any host that builds on push.
  - **Protected branch:** if the branch only takes pull requests, GitHub refuses the commit and the dialog shows GitHub's reason.
- **Removing a plugin:** connections of its types stay saved and show "Plugin not in this build" until it's back.

## Connections

Data sources › Add connection lists the types in this build.

- **The form:** a name, an id, then the type's fields. The id is a slug, fixed once created, and it is what queries name: `{ "datasource": "sales-db", "spec": { … } }`.
- **Before saving:** Test connection runs a cheap request and shows what the server says about itself (a version, a project).
- **Use it in a widget:** shows the type's example query with the connection's id, ready to copy.
- **Status:**
  - **Ready:** it can run.
  - **Locked:** its secrets are saved and the vault is locked.
  - **Needs secrets:** they were kept for a session that ended.
  - **Changed outside the app:** its settings no longer match the ones its secrets were saved with, so nothing is sent until they're typed again.
  - **Plugin not in this build.**
- **Importing a dashboard:** a dashboard whose datasources don't exist here still imports, with a warning naming the missing ones.

## Secrets

Passwords, keys, tokens and connection strings are typed into the app and kept in the vault (`lib/vault`), never in a connection's settings. The reasons and sources are in [browser-secrets](https://github.com/deneslee/mantine-dashboard-builder/blob/0e400dd/.agents/planning/research/browser-secrets.md).

- **This session only (the default):** in memory, gone when the tab closes.
- **Save on this device:** encrypted with a key derived from your passphrase.
  - PBKDF2-SHA256 with 600,000 iterations gives a non-extractable AES-GCM key, held only in memory.
  - After a reload the vault is locked until you unlock it, and Lock relocks it.
  - There is no recovery: Forgot it? deletes the saved secrets.
- **Tied to their settings:** a saved entry includes the connection's settings as they were. If something else on the same origin edits a connection, say to point its relay URL elsewhere, the secrets aren't used.
- **Never in:** dashboards, exports, URLs, query keys, Inspect, toasts or logs. Errors about locked or refused credentials aren't sent to Sentry.
- **Serve the app from an origin of its own.** GitHub Pages serves every one of an account's project sites from `<user>.github.io`, and they share `localStorage`. A custom domain fixes that (the Student Developer Pack includes free ones), as does a host that gives each project its own subdomain.
- **Use credentials that can only read, and short-lived ones where the service has them** ([below](#least-privilege)).

## Queries

Each type checks its query spec with zod when the query is written, imported and run. Every spec has `maxRows`: 10,000 unless it says otherwise, never more than 100,000.

| Type                                | Spec                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Azure SQL, Athena, Aurora, Redshift | `{ "sql": "SELECT …" }`                                                                                                  |
| BigQuery                            | `{ "sql": "SELECT …" }`; the connection's `maximumBytesBilled` caps what a query may bill                                |
| DynamoDB                            | `{ "statement": "SELECT …", "timeFields": ["createdAt"] }`: PartiQL, SELECT only                                         |
| Firestore                           | `{ "structuredQuery": { "from": [{ "collectionId": "orders" }] }, "parent": "…" }`                                       |
| MongoDB                             | `{ "collection": "orders", "pipeline": [{ "$match": {} }], "database": "…" }`; the database defaults to the connection's |

### Time macros

`$__from` and `$__to` are the widget's range as timestamps, and `$__fromMs` and `$__toMs` the same range in epoch milliseconds. Each type binds them as parameters where it can, so a range is never pasted into SQL as text.

| Type      | `$__from` becomes                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------- |
| Azure SQL | `@__from`, a `datetime2` parameter (`@__fromMs` is a `bigint`)                                     |
| Aurora    | `:__from`, a `TIMESTAMP` parameter                                                                 |
| Redshift  | `CAST(:__from AS TIMESTAMP)`                                                                       |
| BigQuery  | `@__from`, a `TIMESTAMP` parameter                                                                 |
| DynamoDB  | `?`, a string or number parameter                                                                  |
| Athena    | `from_iso8601_timestamp('…')`, written from the range itself, since Athena has no named parameters |
| MongoDB   | the string `"$__from"` anywhere in the pipeline becomes `{ "$date": … }`                           |
| Firestore | the string `"$__from"` in the structured query becomes a `timestampValue`                          |

## Relay

Browsers can't open SQL Server or MongoDB connections, so `relay/` does it for the app. It is a small Node server (Hono, `mssql`, `mongodb`) and it is stateless: the connection string comes with each request, and the relay keeps nothing but open connection pools.

- **On this machine:** `vp run relay` listens on `http://127.0.0.1:8787` and needs no token there. In the connection, set Relay URL to `http://localhost:8787` and leave Relay token blank.
  - The relay's settings are environment variables, listed in [relay/.env.example](../../relay/.env.example); a `relay/.env` file is read too.
  - Chrome asks for permission before a site on the internet calls a relay on your machine (Local Network Access). The dev server doesn't trigger it.
- **Deployed:**
  - Build `docker build -f relay/Dockerfile -t dashboard-relay .` from the repo root, and run it on any host with a free container tier.
  - Set `RELAY_TOKEN` (at least 32 characters, e.g. `openssl rand -base64 32`) and paste it into each connection's Relay token.
  - Set `RELAY_ALLOWED_ORIGINS` to the site's origin, and take `localhost` out of `RELAY_ALLOWED_HOSTS`.
  - The relay refuses to listen beyond its own machine without a token.
- **Firewalls:** the database must let the relay in. Azure SQL: a server firewall rule for the relay's address. Atlas: Network Access.
- **What it refuses:**
  - **Origins and the token:** pages from other origins; requests without the token; and, without a token, any request not addressed to localhost, which stops DNS rebinding.
  - **Hosts:** servers outside `RELAY_ALLOWED_HOSTS` (Azure SQL and Atlas hosts and localhost by default), checked with each driver's own connection-string parser.
  - **Sign-ins:** sign-ins as the relay's machine (managed identities, `MONGODB-AWS`), and MongoDB options that read local files or go through a proxy.
  - **Pipelines:** MongoDB stages that write or run JavaScript (`$out`, `$merge`, `$function`, `$accumulator`, `$where`). Only `aggregate` runs, with `$limit` and `maxTimeMS` added.
- **Limits:** bodies up to 256 KB, `RELAY_MAX_ROWS` rows (the query is cancelled there), and `RELAY_TIMEOUT_MS` per query. Errors and logs never contain the connection string or its password.
- **SQL isn't filtered**, because it can't be filtered reliably: give the relay a login that can only read.

## Least privilege

| Type      | Give the connection                                                                                                                                                                                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Azure SQL | A login in the `db_datareader` role: `CREATE USER dashboards WITH PASSWORD = '…'; ALTER ROLE db_datareader ADD MEMBER dashboards;`                                                                                                                                                                               |
| MongoDB   | A database user with the `read` role on the database                                                                                                                                                                                                                                                             |
| Athena    | `athena:StartQueryExecution`, `GetQueryExecution`, `GetQueryResults` and `StopQueryExecution` on the workgroup; Glue read access to the tables; S3 read on the data and read and write on the results location                                                                                                   |
| Aurora    | `rds-data:ExecuteStatement` on the cluster and `secretsmanager:GetSecretValue` on the secret, whose database user can only `SELECT`                                                                                                                                                                              |
| Redshift  | `redshift-data:ExecuteStatement`, `DescribeStatement`, `GetStatementResult` and `CancelStatement`, plus `redshift-serverless:GetCredentials` (Serverless), `redshift:GetClusterCredentials` (a cluster with a database user) or `secretsmanager:GetSecretValue` on the secret, for a user that can only `SELECT` |
| DynamoDB  | `dynamodb:PartiQLSelect` on the tables                                                                                                                                                                                                                                                                           |
| BigQuery  | A service account with BigQuery Data Viewer on the datasets and BigQuery Job User on the project, or a short-lived access token (`gcloud auth print-access-token`)                                                                                                                                               |
| Firestore | A service account with Cloud Datastore Viewer                                                                                                                                                                                                                                                                    |

Prefer temporary AWS credentials (an `ASIA…` key with its session token, e.g. from `aws sts get-session-token`) to a long-lived access key.

## Try it free

Each service has a free way to try it; check the provider's page, since free tiers change.

| Service                  | Free option                                                                                                                                                                                                       |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Azure SQL Database       | The free offer: 100,000 vCore seconds a month per database, for up to 10 databases. A free database pauses when idle; the first query after a pause says it's starting up, and queries work again within a minute |
| MongoDB Atlas            | An M0 cluster, free with no time limit (512 MB)                                                                                                                                                                   |
| BigQuery                 | The sandbox: no billing account, 10 GB of storage and 1 TB of queries a month; tables expire after 60 days                                                                                                        |
| Firestore                | The free quota: 1 GiB stored, and 50,000 reads and 20,000 writes a day                                                                                                                                            |
| DynamoDB                 | Always free: 25 GB of storage                                                                                                                                                                                     |
| Athena, Aurora, Redshift | The AWS Free Tier's credits (up to $200 for new accounts). Aurora Serverless v2 can scale to 0 ACU when idle, and Athena bills only for data scanned                                                              |
