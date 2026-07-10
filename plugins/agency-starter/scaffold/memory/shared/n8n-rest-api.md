---
name: n8n-rest-api
description: Querying n8n executions/workflows via the public REST API instead of an MCP — limits, auth, and gotchas.
type: reference
---

Reusable n8n facts (true across any n8n project). The `n8n-execs` skill is built on these.

- **Base URL:** `https://<your-instance>/api/v1` — auth header `X-N8N-API-KEY: <key>`.
- **Read endpoints:** `/executions` (filter `?status=error|success|running`, `?workflowId=`), `/executions/{id}?includeData=true`, `/workflows`, `/workflows/{id}`.
- **`limit` is capped at 250** by the public API. For wider windows, paginate.
- **Prefer REST over the n8n MCP for reads** — the MCP loads many tools into context and drops connections; REST is near-zero cost and stable.
- **A record stuck in an intermediate status** usually means a non-critical node *before* the final status-set errored (e.g. a duplicate-key insert). Set `onError: continueRegularOutput` on non-critical nodes so the run still reaches the status flip.
- **Code nodes have a ~600s hard limit** that kills the node silently. If a Code node loops over slow HTTP calls, add a time-budget guard and `break` to return partial results.
