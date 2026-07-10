---
name: getting-started
description: Use when someone is new to this system/repo and wants to get set up or oriented — triggers include "tutorial", "getting started", "how do I use this", "set me up", "where do I start", "help me set up memory", "set up supabase", "what can you do", "I'm new", or any sign of a first-time user who needs a guided tour of the memory system, the cloud setup, and the skills.
---

# Getting Started — guided tour of this system

This skill makes **you (Claude) the guide**. The user may be new to all of this —
assume no jargon, no command memorization. Teach by *doing things with them*, one
small step at a time. Don't paste this whole file at them.

> ℹ️ This is the author's real setup, shared as a starter. The skills are generic and
> ready to use; the outside-tool ones just need the user's own keys in `.env`. The part
> they make their own is the **memory** — that is where Section E focuses. Be honest
> about what is ready now vs. what fills in as they use it.

## How to run this (instructions to you, Claude)

1. **Greet warmly (2-3 sentences).** Explain: they talk to you in plain English, you
   do the work, and a safety guard blocks anything destructive — they can't easily
   break things.
2. **Offer the menu**, let them choose:
   - **A** — 60-second basics (how this works)
   - **B** — Set up my memory (so you remember my business) ← recommended first
   - **C** — Connect the cloud (Supabase) — optional, do later
   - **D** — Tour the skills (what I can do)
   - **E** — Make it yours (set up your memory so it sounds like you)
3. **One step at a time.** After each, stop and check: "Make sense? Keep going?"
4. **Do, don't lecture.** Create the files, run the commands, show real output.
5. Keep replies short. Match their pace.

---

## A — The 60-second basics
- You type what you want in plain English. No commands to learn.
- Claude reads/writes files and runs small scripts, and explains before doing anything risky.
- **Memory** (the `memory/` folder) is how the system remembers you between sessions.
- **Skills** (in `.claude/skills/`) are pre-built helpers — just describe your goal.
- A **safety guard** blocks destructive commands automatically.

## B — Set up your memory (the important one)
Goal: by the end, the system knows who they are and how they like to work.

1. Open [`memory/README.md`](../../../memory/README.md) and explain the idea simply:
   **three tiers** (global = always, shared = tech patterns, project = this project)
   and **four types** (`user`, `feedback`, `project`, `reference`).
2. Help them write their **first `user` memory**: edit `memory/global/example-user.md`
   (or make a new file) with who they are and their goal. Keep it one fact, with the
   frontmatter (`name`, `description`, `type: user`).
3. Help them write one **`feedback`** memory — a rule for how they want you to work,
   *with a "Why"*. (Edit `memory/global/example-feedback.md`.)
4. Add a one-line pointer for each in [`memory/MEMORY.md`](../../../memory/MEMORY.md).
5. Show the payoff: run `recall` on a word from what they just wrote and show it found it:
   `python3 .claude/skills/recall/recall.py "<a word they used>"`
6. Tell them: from now on, when they correct you or make a decision, you'll offer to
   save it as a memory so it sticks.

## C — Connect the cloud (Supabase) — optional
Only when they're ready; local memory works without this. Walk them through
[`supabase/README.md`](../../../supabase/README.md) step by step:
1. Create a Supabase project (supabase.com → New project).
2. SQL Editor → paste [`supabase/schema.sql`](../../../supabase/schema.sql) → Run.
3. Project Settings → API → copy **Project URL** and **service_role key** into `.env`
   as `SUPABASE_URL` / `SUPABASE_KEY`. **They paste keys into `.env`, never into chat.**
4. Push memory up: `python3 .claude/hooks/memory-sync.py --force`.
5. Confirm: `python3 .claude/skills/recall/recall.py "<word>"` now shows a
   `## cloud (keyword)` section.
Explain the win: their memory is now backed up and searchable across devices. (Semantic
"by-meaning" search is a later upgrade — note it, don't do it now.)

## D — Tour the skills
Open [`SKILLS.md`](../../../SKILLS.md) and walk the catalog. For each skill they care
about: what it's for, and the plain-English line to trigger it. Offer a **live demo**
of a generic one that's configured (e.g. `n8n-execs health` if their n8n is in `.env`).
Point out which skills are ready now vs. which **need a key** in `.env` (Section C, SKILLS.md).

## E — Make it yours (your memory)
The skills are ready as-is. What makes the system feel like *yours* is the memory: your
facts, your decisions, your preferences. When the user wants to go deeper:
1. Use `grill-me` to interview them on a process they keep re-explaining, and capture it
   into `memory/` so Claude stops asking.
2. Remind them: every time they correct you or make a decision, you offer to save it.
3. Over time the memory becomes the part no generic setup can copy.

---

## When something goes wrong
- **Command blocked** → the safety guard. Read them the reason; not their fault.
- **"Missing credentials"** → that tool's section in `.env` isn't filled. Walk them through it.
- **Overwhelmed** → stop, do one tiny thing, show the result. Momentum over completeness.
