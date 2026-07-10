---
name: leverage-radar
description: Use when the user wants to find the next thing worth automating or fixing — triggers include "what should I automate next", "find me opportunities", "what's wasting my time", "what's failing a lot", "leverage check", "where's the friction". Scans n8n + Pipedrive for repetition, failures, and bottlenecks, then ranks concrete opportunities.
---

# leverage-radar — what should I automate (or fix) next

Looks across your systems for the highest-leverage next move — the thing that, if automated or fixed, saves the most time or money for the least effort. Then hands back a short ranked list with a concrete first step for each.

## How to run this (instructions to you, Claude)

Gather signals (read-only; skip a source cleanly if its `.env` creds aren't set):

1. **What's failing repeatedly in n8n** (rework = leverage):
   `python3 .claude/skills/n8n-execs/n8n_execs.py errors --days 7`
   `python3 .claude/skills/n8n-execs/n8n_execs.py health`
2. **Where the pipeline leaks / piles up:**
   `python3 .claude/skills/pipedrive/pipedrive.py activities --overdue`
   `python3 .claude/skills/pipedrive/pipedrive.py summary`
3. **Optional — recent code work** (only if this is a git repo):
   `git -C . log --oneline -20 2>/dev/null` (ignore if it errors)
4. **Ask him** one question: "What did you do manually this week that felt repetitive?" — his answer is often the best signal.

Then look for these patterns:
- A workflow that fails often → reliability fix (high leverage, low effort).
- The same manual step showing up again and again → automate it.
- Overdue follow-ups stacking up → a reminder/cadence automation.
- A stage where deals stall → a nudge or handoff automation.

Present **5 or fewer ranked opportunities**, best first:

```
🎯 Leverage radar

1. <opportunity> — saves ~<time/money>, effort: low/med/high
   Why: <one line>. First step: <one concrete action>.
2. ...
```

## Rules
- **Rank by leverage = impact ÷ effort.** A small fix that stops daily failures beats a big shiny build.
- **Concrete first step on every item** — something he could start today.
- **Plain English, no JSON dumps.** Translate the signals.
- **Be honest about thin data.** If a source isn't connected or there's little history, say so rather than inventing opportunities.
- **End by recommending ONE** to start with, and ask if he wants to.
