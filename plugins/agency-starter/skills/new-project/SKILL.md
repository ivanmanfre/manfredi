---
name: new-project
description: Use when the user wants to start tracking a new project or area of their work in this system — triggers include "new project", "start a new project", "set up a project", "I'm starting work on X", "track a new client/product/area", "give X its own memory", "PROJECT_ID", or "how do I use this starter for another repo". Picks a PROJECT_ID, seeds the first project-tier memory, adds its pointer to MEMORY.md, and explains how to copy the starter for a separate repo. NOT for adding another memory file inside an existing project (just write the file directly).
---

# new-project — start tracking a new project in this system

This system already remembers you (global tier) and your reusable tech patterns
(shared tier). What changes between jobs is the **project tier** — the IDs, names,
table names, and decisions specific to one piece of work. This skill helps you spin
up that project tier cleanly: give it a name (a `PROJECT_ID`), seed its first memory,
and register it in the index so Claude picks it up every session.

It's lightweight and mostly conversational — there's no database to update and
nothing to register. Memory is just Markdown files in `memory/project/`.

## First decide: same repo, or a separate one?

Two situations, two different answers:

- **One main area of work → keep using this repo as-is.** The `memory/project/`
  folder already holds it. Just pick a `PROJECT_ID`, seed a memory, done (steps
  below). This is the common case.
- **A genuinely separate project that deserves its own repo** (different client,
  different codebase, you want its files isolated) → copy this whole starter into a
  new folder, then run these same steps there. See "Copying the starter" at the end.

Ask the user which one they mean before doing anything. When in doubt, same repo.

## What it does NOT do

- It does **not** create a database row, registry entry, or path map — this is a
  single-user system, so there's no multi-project machinery to wire up.
- It does **not** sync anything to the cloud. If the cloud (Supabase) is configured,
  the existing `memory-sync` hook handles that on its own at the end of a session.
- It does **not** create n8n workflows, CRM records, or external resources — those
  are separate setup.

## Inputs (ask if missing)

| Input | Example | Required |
|---|---|---|
| Project name (human) | "Acme onboarding bot" | yes |
| `PROJECT_ID` (short slug) | `acme` | yes — derive from the name, confirm |
| One-line description | "Automates new-customer onboarding emails" | yes |
| A first real fact or two | a workflow name, a table, a goal | nice to have |

Derive the `PROJECT_ID` from the name (lowercase, hyphens, no spaces) and confirm it
with the user. Keep it short — it becomes the cloud namespace label.

## Steps

Do these one at a time, showing the result, not all at once.

### 1. Set the `PROJECT_ID`

`PROJECT_ID` lives in `.env` and namespaces this project's memory if the user ever
turns on the cloud layer (it's read by `.claude/hooks/memory-sync.py`). Local memory
works without it, but set it now so it's consistent later.

- If `.env` doesn't exist yet, the user should copy `.env.example` to `.env` first
  (it's private, never committed). Walk them through that if needed.
- Set the line `PROJECT_ID=<slug>` in `.env`. If it's still the placeholder
  `PROJECT_ID=project`, replace it. If it already names a different project, see
  "Copying the starter" — they probably want a separate repo, not to overwrite this.

### 2. Seed the first project memory

Create `memory/project/<slug>.md` with the standard frontmatter (see
`memory/README.md` for the format). One file = one fact-cluster. Example shape:

```markdown
---
name: <slug>
description: <one-line description — used when recalling relevance>
type: project
---

This project <does what>. Facts worth remembering:

- <a real ID / name / table — the kind of thing not in the code>
- We decided on <date> to <decision> because <reason>.

(Never put API keys or secrets here — those go in `.env`.)
```

Fill it with whatever real facts the user gives you. If they have none yet, seed a
single goal line so the project tier isn't empty (an empty tier has nothing to sync).
You can keep adding `memory/project/*.md` files over time — no need to cram everything
into one.

### 3. Add the pointer to MEMORY.md

`memory/MEMORY.md` is the index loaded every session. Under the
`## Project (this project)` heading, add one line:

```
- [<Title>](project/<slug>.md) — <short hook>
```

Keep it to one line — title + hook, never the full content. If the example pointer
(`example-project.md`) is still there and the user is done with it, offer to remove
that line and delete the example file.

### 4. Confirm it's picked up

Tell the user the project tier is now live: next session, Claude loads MEMORY.md and
sees the new pointer. To prove it works now, run `recall` on a word from what they
wrote:

```bash
python3 .claude/skills/recall/recall.py "<a word from the memory>"
```

It should find the new file. If the cloud is configured, memory-sync will push it up
under the `PROJECT_ID` namespace at the end of the session — no manual step needed.

## Copying the starter for a separate repo

Only when the user genuinely wants an isolated second project (its own folder, its own
files). The mechanics:

1. Copy this whole starter directory to a new location (a plain folder copy, or
   `git clone` if it's in a repo of its own).
2. In the new copy, replace the placeholder `memory/project/` contents and the
   Project section of `memory/MEMORY.md` with the new project's facts (steps 2–3
   above).
3. Copy `.env.example` to `.env` in the new copy and set a **distinct** `PROJECT_ID`
   so the two projects don't share a cloud namespace.
4. The global and shared tiers are the user's to reuse. As `memory/README.md` notes,
   once they have several projects they can promote `global/` and `shared/` up to
   `~/.claude/memory/` so those apply to every project instead of being copied into
   each repo. Mention this as the "later" path, not a now-step.

## When NOT to use this

- Adding another memory file inside the project you're already in → just write the
  `memory/project/*.md` file and add its pointer to MEMORY.md. No skill needed.
- Renaming a project → edit `PROJECT_ID` in `.env` and the filenames/pointers by hand.
- Capturing a one-off correction or preference → that's a `global/` feedback memory,
  not a new project.

## If something goes wrong

- **`.env` missing** → copy `.env.example` to `.env` first; it's git-ignored and private.
- **`recall` doesn't find the new file** → check the frontmatter is valid (the
  `---` fences and `name`/`type` lines) and that the file is in `memory/project/`.
- **Two projects sharing memory in the cloud** → they have the same `PROJECT_ID`. Give
  each a distinct slug.
