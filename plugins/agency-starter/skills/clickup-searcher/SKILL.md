---
name: clickup-searcher
description: Use when you need to query, search, list, comment on, or update ClickUp tasks/lists/spaces directly via the REST API instead of the ClickUp MCP server. Triggers include "what's in ClickUp", "find the task X", "comment on task", "what tasks are in <list>", "show me recent tasks", "update status to X", or any mention of a ClickUp list or task ID. Requires a CLICKUP_API_TOKEN in the environment.
---

# clickup-searcher — direct ClickUp REST queries, MCP-free

> **Optional skill — ClickUp users only.** This skill is useful only if you
> manage work in ClickUp. It needs your own ClickUp personal API token in a
> `.env` file (see Setup). If you don't use ClickUp, ignore this skill.

## Why this exists

The ClickUp MCP server drops connection regularly and loads ~40 tools into
context per query. This skill wraps the ClickUp REST API directly with a small
Python script — no MCP, minimal context cost, JSON output you can pipe to `jq`.

## Setup

1. Get a personal API token: ClickUp → Settings → Apps → **API Token**
   (format `pk_...`).
2. (Optional but recommended) Find your workspace/team id — it's the numeric id
   in a ClickUp URL like `https://app.clickup.com/<WORKSPACE_ID>/...`.
3. Add both to a `.env` file at your repo root:

   ```
   CLICKUP_API_TOKEN=pk_xxxxxxxx_YOURTOKENHERE
   CLICKUP_WORKSPACE_ID=90000000
   ```

   The script auto-loads the nearest `.env`; real environment variables take
   precedence. `CLICKUP_WORKSPACE_ID` is required only for `search`, `recent`,
   `spaces`, and `lists` without `--space`.

## Invocation

Run from the repo root:

```bash
python3 .claude/skills/clickup-searcher/clickup_search.py <command> [args]
```

## Commands

| Command | Args | What it does |
|---|---|---|
| `tasks <list_id>` | `--status active --limit 50` | List tasks in a list |
| `task <task_id>` | — | Full task detail (description, custom fields, assignees) |
| `search <query>` | `--limit 20` | Full-text search across the workspace |
| `recent` | `--days 7 --limit 50` | Tasks updated in last N days, workspace-wide |
| `lists` | `--space <id>` | All lists (or just one space's lists) |
| `spaces` | — | All spaces in the workspace |
| `comment <task_id> "<body>"` | — | Add a comment |
| `update <task_id>` | `--status closed` | Update task status |

Output is always JSON: `{result: ...}`. Pipe through `jq` if needed.

## Finding your IDs

You don't need to memorize list/space IDs. Discover them on the fly:

```bash
# All spaces in the workspace
python3 .claude/skills/clickup-searcher/clickup_search.py spaces

# All lists (across every space), shows id + name + space
python3 .claude/skills/clickup-searcher/clickup_search.py lists
```

Then plug the list id you want into `tasks <list_id>`. A list id is also visible
in the ClickUp web URL when you open a list.

## When NOT to use

- File attachments — use the ClickUp MCP `attach_task_file` if available.
- Discovering custom-field schemas you've never seen — use the MCP
  `get_custom_fields` once, then note the field IDs you care about.
- Bulk operations on >100 tasks — write a one-off Python script instead
  (this skill keeps payloads small on purpose).

## Examples

```bash
# What's in a given list?
python3 .claude/skills/clickup-searcher/clickup_search.py tasks <list_id> --limit 20

# Find a task by name
python3 .claude/skills/clickup-searcher/clickup_search.py search "carousel"

# What changed this week?
python3 .claude/skills/clickup-searcher/clickup_search.py recent --days 7

# Update a task status
python3 .claude/skills/clickup-searcher/clickup_search.py update <task_id> --status complete
```
