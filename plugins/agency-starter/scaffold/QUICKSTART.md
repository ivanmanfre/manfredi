# Quickstart — drop this into Claude Code in about 15 minutes

This is the memory, skills, and safety layer that turns Claude Code from a chat box
into something that runs the back of your business with you. You talk to it in plain
English. It does the work. Here is the fastest path to a working system.

## Before you start
- **Claude Code installed.** If you do not have it yet, install it first
  (search "Claude Code install"), open a terminal, and confirm `claude` runs.
- That is the only requirement. Everything here is plain Markdown and small Python
  scripts. No build step.

## The 15 minutes

**1. Put this folder where you work (1 min).**
Move the unzipped folder to wherever you keep your projects, or use it as the root of
a new one. The system lives in two places: `memory/` (what it remembers) and
`.claude/` (the skills and the safety guard).

**2. Open the folder in Claude Code (1 min).**
From inside the folder, run `claude`. It reads `CLAUDE.md` on start, so it already
knows how you want it to work.

**3. Add your keys, or skip for now (3 min).**
Copy `.env.example` to a new file named `.env` in the same folder, then fill in only
the tools you actually use. You can skip this entirely and the memory still works
locally. Paste secrets into `.env`, never into the chat. `.env` is already ignored by
git, so it never gets committed.

**4. Run the guided setup (5 min).**
Tell Claude: **"getting started."** It walks you through writing your first memory
(who you are, what your business does, how you like to work) and shows you the payoff
live. Go one small step at a time. You do not need to finish everything in one sitting.

**5. Prove it remembers (2 min).**
Ask Claude something about what you just told it. It pulls the fact back from memory
instead of asking you again. That is the whole point: it stops starting from zero.

**6. Try a skill (3 min).**
Pick one:
- **"morning triage"** for a daily read of what needs you.
- **"what should I automate next"** to rank your highest-leverage fixes.
- **"help me decide between X and Y"** to think a call through from every angle.

See `SKILLS.md` for the full list and the plain-English phrase that triggers each one.

## What you just set up
- A **memory** that holds your business across every session, in three tiers.
- A set of **skills** you trigger by describing your goal.
- A **safety guard** that blocks destructive terminal commands before they run, so you
  cannot easily break things.

## The cloud step (optional, later)
Local memory works with zero setup. When you want your memory backed up and searchable
across devices, follow `supabase/README.md`. The `getting started` skill can walk you
through it.

## If something feels stuck
- A command was blocked? That is the safety guard doing its job. Claude will read you
  the reason.
- "Missing credentials"? That tool's section in `.env` is not filled yet.
- Overwhelmed? Do one small thing, see the result, keep going. Momentum beats finishing.
