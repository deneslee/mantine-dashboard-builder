If you later swap Hono for FastAPI, the whole app side stays as it is. Only the relay folder gets rewritten.

Stays as is (about 740 lines):

App-side code: the relay client, the Azure SQL and MongoDB plugins and their tests (621 lines). The app only knows the relay’s routes, request bodies, responses and status codes, not what it’s written in.
The contract: relayContract.ts and the frame schema (115 lines). It becomes the spec the Python version must match.
Rewritten in Python: relay/src/ (about 930 lines) and its 48 tests. Each piece has a direct counterpart, and the existing tests work as a checklist:

Settings and host allowlist: settings move to pydantic-settings. The host allowlist and hiding passwords in error messages become plain Python.
MongoDB: PyMongo covers it.
pymongo.uri_parser is the driver’s own parser, so the relay still checks exactly the hosts it will connect to.
bson.json_util reads the $date/$oid values.
SQL Server: this is the hardest part.
You’d use pyodbc, which needs Microsoft’s ODBC driver in the image, or pymssql.
Neither has named parameters. The relay would declare @__from and friends itself, so the SQL your widgets send wouldn’t change.
You’d also need your own parser for the connection-string host check.
Things FastAPI doesn’t do out of the box:
refusing other websites with a 403 (its CORS middleware only leaves headers out);
the header Chrome wants before a public site calls a local relay;
a request size limit;
answering bad requests with the relay’s own error shape instead of FastAPI’s default 422.
Removed: the workspace entry, the TypeScript reference and the relay lint rule. CI would need a Python job.
The main risk is the two sides drifting apart. Today both are checked by the same TypeScript types. Two cheap safeguards would help: export the contract as JSON Schema (to generate the Python models from it), or add a small test suite any relay can be run against. Neither is in the plan; say if you want one.
