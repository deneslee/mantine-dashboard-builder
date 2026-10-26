# Capability catalog: potential

<!-- Generated from catalog/catalog.yaml by scripts/generate-catalog.mjs. Edit the YAML, not this file. -->

Capabilities, plugins and patterns under consideration: nothing here is planned until it moves to [core.md](core.md). Domain packages, such as rhb-cdss's body map, belong to their host app and aren't listed.

**Status words:** fixed (built on, never swapped), built, decided, default (the pick unless a decision changes it), option, proposed, later, open (needs a decision), reference (to learn from). Steps P1–P12 are the builder phases in the project plan.

## Capabilities that could be added

| Capability                | What it adds                                                             | Candidates                                                    | Status   |
| ------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- | -------- |
| **Knowledge (RAG)**       | Document search and answers with sources, with or without the chat panel | pgvector<br>Haystack<br>Elasticsearch<br>Qdrant<br>Convex RAG | Proposed |
| **Collaboration**         | Presence, comments and shared editing                                    | Convex<br>Supabase Realtime<br>Yjs                            | Proposed |
| **Document intelligence** | Parsing, OCR, extraction and indexing of documents                       | Haystack<br>Document parsers<br>OCR services                  | Proposed |
| **Analytics explorer**    | Profiling, SQL exploration and shared metric definitions                 | DuckDB-Wasm<br>Cube<br>ClickHouse                             | Proposed |
| **Reports**               | Report templates and bulk generation                                     | Typst<br>WeasyPrint<br>PDF renderers                          | Proposed |
| **Automation**            | Pipelines and scheduled work                                             | Kestra<br>Convex Workflow                                     | Proposed |
| **Knowledge graph**       | A relationship explorer                                                  | Neo4j<br>React Flow views                                     | Proposed |
| **Maps**                  | Map widgets and region selection                                         | MapLibre<br>deck.gl<br>Leaflet                                | Proposed |
| **3D views**              | 3D plots and spatial models                                              | Three.js<br>React Three Fiber                                 | Proposed |

## Plugins and integrations under consideration

What each could provide (core or potential capabilities it can fill) and what it adds on top.

### Data and backends

| Plugin                                         | Provides                                                                   | Adds                                                                   | Status   | Notes                                                  |
| ---------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------- | -------- | ------------------------------------------------------ |
| **Supabase**                                   | App data storage, Records storage, Assets, Sign-in and permissions, Search | Postgres with a generated REST API<br>Realtime updates<br>File storage | Option   | Free plan: 2 projects, paused after a week without use |
| **PostgreSQL through a host API**              | Records storage, Search, Knowledge (RAG)                                   | Relational data<br>Full text and pgvector                              | Option   | –                                                      |
| **PGlite or SQLite WASM**                      | App data storage, Records storage                                          | SQL in the browser, offline                                            | Option   | –                                                      |
| **S3, Azure Blob or MinIO**                    | Assets                                                                     | A media browser<br>Dataset snapshots                                   | Option   | –                                                      |
| **DuckDB-Wasm**                                | Query and filtering, Analytics explorer                                    | CSV and Parquet explored in the browser<br>Data profiling              | Option   | –                                                      |
| **Cube**                                       | Datasources, Analytics explorer                                            | Metric and KPI definitions kept in one place                           | Option   | –                                                      |
| **ClickHouse**                                 | Datasources, Analytics explorer                                            | Analytics on large data                                                | Option   | –                                                      |
| **`postgres` and `elasticsearch` datasources** | Datasources                                                                | –                                                                      | Proposed | –                                                      |
| **Datadog metrics**                            | Datasources                                                                | Metrics widgets                                                        | Later    | –                                                      |

### Search, knowledge and assistant

| Plugin                              | Provides                                            | Adds                                                               | Status | Notes                                                  |
| ----------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------ | ------ | ------------------------------------------------------ |
| **Elasticsearch or OpenSearch**     | Search, Knowledge (RAG)                             | Hybrid text and vector search<br>Aggregations<br>Query diagnostics | Option | –                                                      |
| **Meilisearch or Typesense**        | Search                                              | Typo tolerance and facets with little setup                        | Option | –                                                      |
| **Qdrant or Weaviate**              | Knowledge (RAG)                                     | Similarity search                                                  | Option | –                                                      |
| **Haystack**                        | Knowledge (RAG), Document intelligence, Datasources | Retrieval pipelines<br>Answers with sources                        | Later  | –                                                      |
| **Convex Agent and RAG components** | Assistant, Knowledge (RAG)                          | Saved threads<br>Retrieval<br>Live answers                         | Option | –                                                      |
| **Ollama or vLLM**                  | Assistant                                           | Offline demos                                                      | Option | –                                                      |
| **Direct model providers**          | Assistant                                           | –                                                                  | Option | Microsoft Foundry, Gemini, Mistral, OVHcloud, Scaleway |
| **Langfuse**                        | Telemetry                                           | A trace of every assistant call                                    | Option | –                                                      |
| **Jev (typesafe.ai)**               | Assistant                                           | Typed choices with calibrated probabilities, for classifying text  | Option | –                                                      |

### Rules, workflows and telemetry

| Plugin                        | Provides                              | Adds                                                         | Status | Notes                                                                   |
| ----------------------------- | ------------------------------------- | ------------------------------------------------------------ | ------ | ----------------------------------------------------------------------- |
| **GoRules JDM editor**        | Graphs (node builder), Decision rules | A ready-made editor for decision graphs                      | Option | A separate editor only: it bundles Ant Design and older Zod and Zustand |
| **Kestra**                    | Background jobs, Automation           | Import pipelines<br>Scheduled exports<br>Workflow monitoring | Option | –                                                                       |
| **Convex Workflow**           | Background jobs, Automation           | Durable steps with retries and progress                      | Option | –                                                                       |
| **OpenTelemetry and Grafana** | Telemetry                             | Traces and metrics dashboards                                | Option | –                                                                       |
| **Datadog RUM or New Relic**  | Telemetry                             | Real-user monitoring                                         | Option | –                                                                       |

### Collaboration

| Plugin  | Provides      | Adds                                   | Status   | Notes |
| ------- | ------------- | -------------------------------------- | -------- | ----- |
| **Yjs** | Collaboration | Shared editing of documents and graphs | Proposed | –     |

## Patterns and references

Ideas to borrow from other products, not dependencies.

| Pattern                                                 | From                                                                                     | For                             | Status    |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------- | --------- |
| Column types and detectors                              | [EUI data grid](https://eui.elastic.co/docs/components/data-grid/schema-and-columns/)    | The table widget (P7)           | Decided   |
| Page header: title, description, tabs, up to ~3 actions | [EUI page header](https://eui.elastic.co/docs/components/layout/page-header/)            | The control-bar regrouping (P1) | Open      |
| Page frame with a bottom bar and an empty-state prompt  | [EUI page template](https://eui.elastic.co/docs/components/templates/page-template/)     | Edit mode and empty pages (P1)  | Open      |
| Inline header search with typed results                 | [EUI sitewide search](https://eui.elastic.co/docs/components/templates/sitewide-search/) | Search results and their layout | Open      |
| Collections, fields, interfaces and relations           | [Directus](https://directus.com/docs/getting-started/data-model)                         | Studio's data screens (P4)      | Reference |
| Scenes: dashboards as objects with scoped state         | [Grafana Scenes](https://grafana.com/developers/scenes)                                  | Dashboard v2 (P8)               | Reference |
| Embeddable dashboards; UI packages apart from plugins   | [Perses](https://perses.dev/)                                                            | Dashboard v2 (P8)               | Reference |
| Frontend modules and extension slots                    | [OpenMRS O3](https://openmrs.org/)                                                       | Plugin contributions (P11)      | Reference |
| Typed extension blueprints                              | [Backstage](https://backstage.io/)                                                       | Plugin contributions (P11)      | Reference |
