# Memory — how this system remembers

This folder is the system's long-term memory. It's plain Markdown files, so it's
readable, editable, and version-controlled. Claude reads from here every session,
so it remembers your business across conversations instead of starting from zero.

There are **three tiers** (where a memory lives) and **four types** (what kind of
fact it is). Getting these right is what makes the system feel like it "knows you."

---

## The three tiers (where memory lives)

| Tier | Folder | Loads when… | Holds |
|---|---|---|---|
| **Global** | `memory/global/` | every session, every project | who you are, your preferences, how you want Claude to work |
| **Shared** | `memory/shared/` | every session, every project | reusable technical patterns (n8n, Supabase, APIs) — facts true across projects |
| **Project** | `memory/project/` | this project | facts specific to one project: IDs, table names, workflow names, keys |

> **Tip:** as you grow, you can move `global/` and `shared/` up to `~/.claude/memory/`
> so they apply to *all* your projects, not just this repo. Start in-repo; promote later.

## The four types (what a memory is)

Set `type:` in each file's frontmatter:

- **`user`** — who you are (role, business, expertise, preferences). Lives in `global/`.
- **`feedback`** — how you want Claude to work; a correction or a confirmed approach. Always include **why**. Lives in `global/`.
- **`project`** — ongoing work, goals, constraints, IDs not derivable from code. Lives in `project/`.
- **`reference`** — pointers to external resources (URLs, dashboards, tickets).

---

## The file format

Every memory is **one file = one fact**, with this frontmatter:

```markdown
---
name: short-kebab-case-slug
description: one-line summary — used to decide relevance when recalling
type: user | feedback | project | reference
---

The fact itself. For `feedback` and `project`, follow with:

**Why:** the reasoning, so future-you (and Claude) trust it.
**How to apply:** the concrete action.

Link related memories with [[their-name-slug]].
```

## The index: MEMORY.md

`MEMORY.md` is the one file loaded into context every session. It's a table of
contents — **one line per memory** (`- [Title](file.md) — hook`), never the full
content. Keep it skimmable. When you add a memory file, add its one-line pointer here.

## Linking memories

In a memory's body, link related ones with `[[name-slug]]` (the other file's `name:`).
Link liberally — a `[[link]]` to a memory you haven't written yet is fine; it marks
something worth capturing later.

---

## What NOT to save

- Things the code already records (structure, past fixes, git history).
- Things that only matter to one conversation.
- Secrets/API keys — those go in `.env`, never in memory.

## Going to the cloud (optional, advanced)

Files here can mirror to a Supabase `claude_memory` table for fast semantic search
across everything (the `recall` skill uses it when configured). Local search works
with zero setup — see [`../supabase/README.md`](../supabase/README.md) to turn on
the cloud layer. The `getting-started` tutorial walks you through it.
