# Your AI Operating System — workspace guide

This file tells Claude how to behave in this workspace. Edit the bracketed bits.

> ℹ️ This is the setup I run my agency on, cleaned up so you can drop it in. The skills
> are generic; the ones that talk to an outside tool just need your own keys in `.env`
> (see [SKILLS.md](SKILLS.md)). The part you make yours is the memory in `memory/` —
> run `getting started` and it walks you through it.

## Who I am
- **Name:** [your name]
- **Business:** [what you do]
- I'm [technical / non-technical]. Explain things in plain English and teach as you go.
  (Put more detail in `memory/global/` — see [memory/README.md](memory/README.md).)

## How I want Claude to work
- **Plain English first.** Say what you're about to do and why, then do it.
- **Small steps.** One thing, show the result, then continue.
- **Read-only on my live systems by default.** Inspect (n8n, Pipedrive) freely; don't
  edit or trigger anything live unless I explicitly ask.
- **Secrets live in `.env`, never in chat or git.**
- **Use memory.** Before guessing or asking, use the `recall` skill. When I make a
  decision or correct you, offer to save it to `memory/`.
- **When I'm new or stuck, use the `getting-started` skill.**

## What's here
- **`memory/`** — long-term memory (3 tiers, 4 types). The system's brain. See its README.
- **`.claude/skills/`** — the skills. Catalog + what each one needs: [SKILLS.md](SKILLS.md).
- **`supabase/`** — optional cloud memory (backup + cross-device search).

## Safety
A guard runs before every terminal command and blocks destructive ones (deleting
files, force-pushing). On purpose. If something's blocked, it explains why.
