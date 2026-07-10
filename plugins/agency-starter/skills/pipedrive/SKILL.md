---
name: pipedrive
description: Use ANY time you need to look something up in Pipedrive — deals, pipeline value, a contact/person, open or overdue activities, pipelines and stages, or a quick CRM search. Direct REST API wrapper, read-only. Triggers include "what deals are open", "what's my pipeline worth", "find <person/company> in Pipedrive", "what activities are overdue", "show my pipelines", "look up deal X".
---

# pipedrive — query your Pipedrive CRM via REST

## Why this exists

Lets you ask about your CRM in plain English without opening Pipedrive. Wraps the Pipedrive REST API directly — reliable, near-zero token cost. **Read-only:** it looks things up, it never creates, edits, or deletes records.

## One-time setup

The `claude-code-tutorial` skill can walk you through this. In `.env` at the repo root:

```
PIPEDRIVE_DOMAIN=yourcompany        # the part before .pipedrive.com
PIPEDRIVE_API_TOKEN=...             # Pipedrive -> Settings -> Personal preferences -> API
```

Paste the token into the `.env` file, not into chat.

## Invocation

Run from the repo root:

```bash
python3 .claude/skills/pipedrive/pipedrive.py <command> [args]
```

## Commands

| Command | Purpose |
|---|---|
| `summary` | Open deals: how many, total value by currency, count per stage — **start here** |
| `deals [--status open\|won\|lost\|all] [--limit N]` | List deals, most recently updated first |
| `deal <id>` | Full detail on one deal |
| `search <query>` | Search across deals, people, and organizations |
| `persons [--limit N]` | Recent people/contacts |
| `pipelines` | Your pipelines and their stages (maps stage IDs → names) |
| `activities [--overdue] [--limit N]` | Open (not-done) activities; `--overdue` = only past-due |

Output: JSON `{pipedrive, result}`. The API token is never printed.

## Examples

```bash
# What's my pipeline worth right now?
python3 .claude/skills/pipedrive/pipedrive.py summary

# What needs chasing — overdue activities?
python3 .claude/skills/pipedrive/pipedrive.py activities --overdue

# Find a contractor / company
python3 .claude/skills/pipedrive/pipedrive.py search "acme construction"

# Recent open deals
python3 .claude/skills/pipedrive/pipedrive.py deals --status open --limit 20
```

## Notes

- `summary` reports deals **by stage ID**. Run `pipelines` once to see which name each stage ID maps to.
- To act on the CRM (create/update a deal, log an activity), do it in Pipedrive directly — this skill is read-only by design.
- `value_by_currency` sums raw deal values per currency; it does not convert between currencies.
