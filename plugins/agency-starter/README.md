# agency-starter

You open Claude Code and it already knows your clients, your workflows, and what broke in your automations overnight. It tells you what to automate next before you ask. This kit is what does that: the memory, the skills, and the safety layer I run my agency on, cleaned up so you can drop it into your own Claude Code.

## Install

```
/plugin marketplace add ivanmanfre/manfredi
/plugin install agency-starter@manfredi
```

## What you get

**14 working skills**, available in any project once installed (namespaced as `/agency-starter:<skill>`):

- `getting-started` — guided tour and setup of the whole system
- `new-project` — give a client, product, or area its own memory
- `brain` / `recall` — relational and quick lookup over your own memory
- `morning-triage` — what broke overnight, what needs you today
- `leverage-radar` — what to automate next, ranked from real friction
- `decide`, `grill-me`, `usage-insights`, and the tool wrappers (`n8n-execs`, `pipedrive`, `clickup-searcher`, `pp-firecrawl`, `playwright-driver`)

**The scaffold** (in this plugin's `scaffold/` directory): the `CLAUDE.md` operating rules, the three-tier `memory/` structure, the guard hooks (`guard.py` blocks destructive commands, `context-budget-guard.py` watches token burn, `memory-sync.py` mirrors memory to Supabase), the `.env.example`, and an optional Supabase schema for cloud memory search.

## Two ways to run it

1. **Skills only.** Install the plugin and use the skills in any existing project. Zero setup.
2. **Full system.** Copy the `scaffold/` contents into a new project folder (dotfiles like `.gitignore` and `.env.example` included), open Claude Code there, and run `/agency-starter:getting-started`. About 15 minutes to a working memory + guard setup. `scaffold/QUICKSTART.md` is the step-by-step.

## Want this run for you

The kit is the engine room. I build the content and automation back end for agencies on top of it, installed, tuned to your business, and run for you. A free 30-minute fit call, no pitch: you leave with a plan, whether or not we work together. **[ivanmanfredi.com/start](https://ivanmanfredi.com/start/)**
