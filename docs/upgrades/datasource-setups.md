I compared our design with DBX, Grafana, Kibana and Perses, focusing on how they handle data sources, plugins and secrets; no code was changed. The dashboard and grid side was compared with Grafana, Perses and Metabase in our earlier research (`research/dashboard-architectures.md`, `research/integrations.md`).

**Overall:** they mostly confirm the choices we made. The gaps worth borrowing from are a short list, and only the first item is worth doing soon.

## How each one is set up

|                       | DBX ([t8y2/dbx](https://github.com/t8y2/dbx))                                          | Grafana                                                                        | Kibana                                                           | Perses                                                           | Ours                                                                            |
| --------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| What it is            | Desktop database client (Tauri, Rust backend, Vue), plus a Docker web version          | Dashboard server (Go) with a React frontend                                    | Elastic's UI server (Node)                                       | Dashboards-as-code server (Go) with a React frontend             | Static React app, plus an optional small relay                                  |
| Where queries run     | Rust drivers on the backend; Java (JDBC) helper processes for extra databases          | Mostly on the backend; plugins can be frontend-only                            | Server side                                                      | Server-side proxy                                                | In the browser (AWS, Google); through the relay (Azure SQL, MongoDB)            |
| How plugins are added | Signed packages from a marketplace, each running in a sandboxed process                | `plugin.json` plus `module.js`, installed on the server and loaded when needed | Plugins built into the distribution, switched on in `kibana.yml` | Plugin archives loaded at runtime (module federation)            | `plugins.json` chosen at build time; unlisted plugins have no code in the build |
| Where secrets live    | Encrypted in a local database; the key is in the OS keychain, or a key file for Docker | `secureJsonData`, encrypted on the server and never sent to the browser        | Encrypted saved objects, with a key in config                    | A separate `Secret` resource that the server-side proxy resolves | Browser vault: memory, or encrypted with your passphrase                        |

## What they confirm about our design

- **A relay for databases browsers can't reach.** DBX needs a Rust backend for the same reason: SQL Server and MongoDB need raw connections. Grafana's backend plugins exist for this too. Our relay is the minimal version of that.
- **One data shape between data sources and widgets.** Our `DataFrame` is Grafana's model, and our docs already cite it.
- **Building only what you choose.** Kibana and Metabase do this through server configuration. Ours goes further: an unlisted plugin's code isn't in the build at all.
- **Tying secrets to their settings.** Perses had a high-severity vulnerability ([CVE-2026-63199](https://app.opencve.io/cve/CVE-2026-63199)): a low-privilege user could point a data source at their own server and get its secret decrypted and sent there. Our vault refuses to use secrets when a connection's settings (such as the relay URL) have changed. That is the same class of attack, already covered.
- **Secrets never sent back.** Grafana's rule is that encrypted fields are write-only: the edit form shows "configured" and never the value ([docs](https://grafana.com/docs/grafana/v6.7/developers/plugins/authentication/)). Our form behaves the same way ("Saved, leave blank to keep").

## What's worth borrowing, in priority order

1. **Test databases in Docker Compose (from DBX).** DBX keeps versioned Compose recipes in `deploy/database/` and checks them with `make db-verify DB=mysql@8.4`. A `deploy/compose.yaml` with SQL Server, MongoDB and the relay would let the relay's drivers be tested against real servers locally and in CI. Today they're only tested with fakes, and that is our biggest verification gap.
2. **A shared vault key for teams (from DBX and Grafana).** Both keep the key outside the data: DBX in the OS keychain or a key file, Grafana as a server-side key. Our passphrase vault suits a single user in a browser. If more than one person ever uses one deployment, connections would need to live on the relay with a server-side key (like Grafana's `secureJsonData`).
3. **Sign plugins and sandbox their UI (from DBX and Grafana).** Only relevant if third-party plugins are ever allowed. Our plugins are compiled into the app from the repo, so this isn't needed now. It's the path to follow if runtime plugins ever come up (option C in `research/integrations.md`).
4. **A helper that scaffolds new plugins (from DBX's `@dbx-app/plugin-cli` and Grafana's `create-plugin`).** For us that would be a `vp run new-plugin <id>` script creating `src/plugins/optional/<id>/` with a manifest, runtime and test, and adding the entry to `plugins.config.ts`. It's nice to have, worth it only past about six plugins.
5. **Frontend-only versus backend plugins (from Grafana).** Grafana's `plugin.json` declares `backend: true` when a plugin needs the server. Our relay plugins could say "needs the relay" in their manifest, so the Data sources page could warn up front instead of after a failed test. It's a small UX gain.
6. **Server-side query caching (from Grafana).** Grafana caches query results on the server. Our relay doesn't, which is the right call for a stateless relay. Revisit it only if free-tier quotas start to hurt.

## Things not to copy

- **Kibana's model:** plugins compiled together, with exact version locks. It's heavy, and our build-time list already gives the benefit without the cost.
- **Runtime plugin loading like Perses:** it brings the duplicate-React problems already noted in `research/integrations.md`.
- **DBX's breadth:** over 100 databases, Java helper processes and a Rust toolchain. That's right for a database client, but too much for a showcase dashboard.

If you want, I can save this as `.agents/planning/research/datasource-setups.md`, and add #1 and #5 to `tasks.md` as follow-ups.

Sources:

- [t8y2/dbx](https://github.com/t8y2/dbx)
- [CVE-2026-63199 (Perses)](https://app.opencve.io/cve/CVE-2026-63199)
- [Grafana: authentication for data source plugins](https://grafana.com/docs/grafana/v6.7/developers/plugins/authentication/)
- [Grafana: auth for datasources](https://grafana.com/docs/grafana/v5.3/plugins/developing/auth-for-datasources)
