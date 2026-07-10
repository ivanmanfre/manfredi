# manfredi — working Claude Code kits from a real agency operator

These are the systems I run my own automation agency on, packaged as installable Claude Code plugins. Every kit here came out of client work with $1-10M service firms. When the model era shifts, the kits get a version bump, and your install picks it up on the next refresh.

## Install

```
/plugin marketplace add ivanmanfre/manfredi
/plugin install agency-starter@manfredi
```

Swap `agency-starter` for any plugin below. Each installs independently.

## What's in here

| Plugin | What it does |
|---|---|
| `agency-starter` | The memory tiers, project scaffold, guard hooks, and 14 working skills my agency's Claude Code runs on |
| `drop-point-read` | Reads one sales call transcript and names the exact line where the deal slipped |
| `content-engine-starter` | The skeleton of a Claude-run LinkedIn content engine: pipeline prompts, anti-slop rules, scoring rubric |
| `strip-ai-tells` | A line editor that finds the 14 tells of AI-written copy and rewrites them out |
| `client-onboarding` | A skill plus four stage agents that run client intake without the founder in the room |

## What this is, and what it isn't

This is the starter layer: real patterns, real skills, real rubrics, cleaned up so they drop into your setup. It is honest about being the starter. The tuned canon, the full pipelines, and the wiring into a live business are the work I do with clients.

## Updates

Each plugin carries an explicit semver in `plugin.json`. A version only bumps when something material changed, usually a model-era refresh. Run `/plugin marketplace update manfredi` and check `/plugin` to pick up new versions. Changelogs live inside each plugin.

## Want it run for you

I build and run these systems for agencies. If you want the installed, tuned version instead of the starter, book a free fit call: **[ivanmanfredi.com/start](https://ivanmanfredi.com/start/)**
