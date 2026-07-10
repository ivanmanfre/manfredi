---
name: morning-triage
description: Use when the user wants a quick daily status check — triggers include "morning triage", "what needs me today", "what broke overnight", "daily check", "start my day", "what's going on", or opening the day and asking for the state of things. Pulls n8n failures + Pipedrive pipeline/activities into one short triage.
---

# morning-triage — your 2-minute daily check

A single command that answers: **"What broke, and what needs me today?"** It combines what's failing in n8n with what's moving (or stuck) in the Pipedrive pipeline, then hands back a short, prioritized list.

## How to run this (instructions to you, Claude)

Gather, then synthesize. Run these read-only commands (skip a source cleanly if its `.env` creds aren't set — just note it):

1. **n8n failures (last 24h):**
   `python3 .claude/skills/n8n-execs/n8n_execs.py errors --days 1`
2. **n8n currently running** (catch anything stuck):
   `python3 .claude/skills/n8n-execs/n8n_execs.py active`
3. **Pipedrive overdue activities:**
   `python3 .claude/skills/pipedrive/pipedrive.py activities --overdue`
4. **Pipedrive open-pipeline snapshot:**
   `python3 .claude/skills/pipedrive/pipedrive.py summary`

Then present a **short triage**, newest/most-urgent first:

```
☀️ Morning triage — <today>

🔴 Needs you
  • <n8n workflow> failed 3× overnight — likely <plain-English guess>
  • <N> overdue follow-ups in Pipedrive (e.g. "call Acme", due 2 days ago)

🟡 Keep an eye on
  • <workflow> still running 40 min — may be stuck

🟢 Pipeline
  • <N> open deals, ~<value> — <one-line read>
```

## Rules
- **Plain English.** No raw JSON dumped at the user — translate it.
- **One concrete next action per 🔴 item** ("re-run it?", "want me to look at why it failed?").
- **Be honest about gaps.** If a source's creds aren't set, say "Pipedrive not connected yet" rather than guessing.
- **Keep it short.** This is a 2-minute check, not a report. If everything's green, say so in one line.
- **Read-only.** Don't fix or change anything during triage unless the user asks.
