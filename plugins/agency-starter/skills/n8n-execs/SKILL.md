---
name: n8n-execs
description: Use ANY time you need to inspect n8n workflow runtime state — recent executions, errors, currently-running, workflow lookup by name, workflow trigger inspection, or n8n health. Direct REST API wrapper, no MCP. Triggers include "show recent executions", "what failed today", "is X running", "find workflow Y", "what triggers does Z have", "n8n health", "last run of <workflow>".
---

# n8n-execs — inspect your n8n at runtime via REST

## Why this exists

The n8n MCP servers load 22+ tools into context and drop connections. This skill wraps the n8n public REST API directly — same data, near-zero token cost, rock solid. **Use it instead of any n8n MCP for read queries.** It is read-only: it never edits or fires a workflow.

## One-time setup

The `claude-code-tutorial` skill walks the user through this. Manually:

1. Copy `.env.example` → `.env` at the repo root.
2. Set `N8N_API_URL` (your instance base, e.g. `https://yourname.app.n8n.cloud` — no `/api/v1`) and `N8N_API_KEY` (n8n → Settings → n8n API → Create an API key). Paste the key into the `.env` file, not into chat.

## Invocation

Run from the repo root:

```bash
python3 .claude/skills/n8n-execs/n8n_execs.py <command> [args]
```

## Commands

| Command | Purpose |
|---|---|
| `health` | Workflow count, active count, last-250 status breakdown — **start here** |
| `errors [--days N]` | Failures only, last N days |
| `recent [--days N] [--status STATUS]` | Recent executions, filtered by status (error/success/running) |
| `active` | Currently-running executions |
| `wf <workflow_id> [--limit N]` | Last runs of one workflow |
| `exec <id> [--include-data]` | Full execution detail; `--include-data` adds node input/output |
| `search <query>` | Find workflows by name (substring match) |
| `wf-info <workflow_id>` | Workflow metadata + trigger nodes |

Output: JSON `{host, result}`. Pipe through `jq` if you want to slice it.

## Examples

```bash
# Is anything broken right now?
python3 .claude/skills/n8n-execs/n8n_execs.py errors --days 1

# Overall health snapshot
python3 .claude/skills/n8n-execs/n8n_execs.py health

# Find a workflow by name
python3 .claude/skills/n8n-execs/n8n_execs.py search outreach

# What fires this workflow — schedule? webhook?
python3 .claude/skills/n8n-execs/n8n_execs.py wf-info <workflow_id>

# Full input/output of one execution (great for debugging a failure)
python3 .claude/skills/n8n-execs/n8n_execs.py exec <exec_id> --include-data
```

## Limitations

- **Read-only.** To fire a workflow on demand, use a Webhook trigger node + curl. To *edit* workflows, use the n8n editor or the n8n MCP.
- **`limit` capped at 250** by the n8n public API. For wider windows, paginate.
- **No node-schema validation.** This reports runtime state, not config correctness.

## Debugging pitfalls (hard-won)

- **A record stuck in an intermediate status** (e.g. "processing") usually means a non-critical node *before* the final status-set errored (often a duplicate-key insert or a failed notification). The run dies there and never flips the status. Fix: set `onError: continueRegularOutput` on non-critical insert/notification nodes that precede the status-setting node.
- **`runOnceForAllItems` + reading `$json.batch`** silently drops every batch after the first — the run "succeeds" but only N items get processed. Spot it when a processor runs clean but the backlog barely moves. Fix: run the node per-item, or loop `$input.all()` with an explicit counter.
- **Empty execution history on a webhook workflow** doesn't always mean it's broken. First check whether a high-volume sub-workflow is burning your execution retention (`recent --days 1`; if the last 100 rows span only minutes, retention is the cause). Probe liveness with a GET to the production webhook URL (n8n replies "did you mean POST?" when it's registered) rather than firing test data.
- **For webhooks that trigger destructive downstream actions** (creating CRM records, generating documents), do NOT fire a test POST to check health — use a GET probe + downstream record counts as proof. "No errors + no recent runs" can mean healthy-but-idle OR the upstream caller stopped posting; only a real event resolves it.
- **n8n Code nodes have a 600s hard limit** that kills the node silently (no error, downstream never runs). If a Code node loops over slow HTTP calls, a few slow ones blow the budget. Fix: add `const startTime = Date.now()` at loop entry and `break` when `Date.now() - startTime > 500000` before each call, so the node returns partial results and downstream write nodes still run.
