---
name: usage-insights
description: Use when the user wants to understand how they're using Claude Code — triggers include "how am I using Claude Code", "usage insights", "which skills am I actually using", "am I getting value out of this", "what am I not using", or a periodic self-check while learning the tool.
---

# usage-insights — how you're using Claude Code

A friendly, private look at your own Claude Code activity: how many sessions, which
tools and skills you actually lean on, and what you've never touched. Great while
you're learning. Nothing leaves your machine.

## Invocation

Run from the repo root:

```bash
python3 .claude/skills/usage-insights/usage_insights.py            # last 30 days
python3 .claude/skills/usage-insights/usage_insights.py --days 7   # last week
```

## How to use the output (instructions to you, Claude)

Run it, then talk through it in plain English — don't just paste numbers:

1. **Celebrate usage.** "You've run N sessions and lean on X most — nice."
2. **Spot unused skills.** Compare against the skills in `.claude/skills/`. For each one
   they haven't tried, give a one-line "here's what that does, want to try it?"
3. **One suggestion** based on what they do a lot.
4. Keep it encouraging — they're learning. This is "what could I get more out of," not a scorecard.
