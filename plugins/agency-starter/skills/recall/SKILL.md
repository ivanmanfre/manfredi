---
name: recall
description: Use ANY time you're about to answer something that depends on a remembered fact — a workflow ID, a table name, an API quirk, a past decision, a preference, a rule. Invoke BEFORE guessing, asking the user, or searching the web. Triggers include "what's the X", "where did we", "did we already", "find me", "remember", "the rule about", "ID for", any mention of a stored name/key/decision.
---

# recall — search your memory

Searches your memory before you answer from guesswork. Looks across all local tiers
(`global`, `shared`, `project`) and — if the cloud layer is set up — the Supabase
mirror by keyword too.

## When to use

- Before asking the user a question that memory might already answer.
- Before guessing an ID, name, key location, or past decision.
- "Did we already decide / handle / build X?"

## Invocation

Run from the repo root:

```bash
python3 .claude/skills/recall/recall.py "<query>"
```

Cloud search turns on automatically when `SUPABASE_URL` + `SUPABASE_KEY` are in
`.env` (see [`../../../supabase/README.md`](../../../supabase/README.md)). Without
them, local search still works fully.

## Reading the output

Results are grouped by tier with `file:line` citations. Cite them back to the user as
clickable links so they can navigate. If nothing matches, say so plainly — don't
invent a memory.

## After recalling

If you learned something durable that *wasn't* in memory (a new preference, decision,
or fact), offer to save it: write a file under the right `memory/` tier and add its
one-line pointer to `memory/MEMORY.md`. See [`../../../memory/README.md`](../../../memory/README.md).
