# Skills — the catalog

Skills are pre-built helpers. You do not run them by name or memorize commands. You
describe your goal in plain English and Claude picks the right one. The "say this"
column is just the kind of phrasing that triggers each skill.

Every skill here is generic. The ones that talk to an outside tool need your own key
in `.env` (marked **Needs key**). Nothing carries anyone else's business data. The
only thing you adapt to yourself is your **memory** (`memory/`), which starts with
example files you replace with your own facts.

## The brain (memory)
| Skill | What it does | Say this |
|---|---|---|
| `recall` | Pulls a remembered fact before guessing: an ID, a table name, a past decision, a preference. | "what did we decide about…" |
| `brain` | Answers relational or by-meaning questions across your whole memory, not just a keyword match. | "everything related to X" |

## Your day
| Skill | What it does | Say this |
|---|---|---|
| `morning-triage` | A daily read of what broke overnight and what needs you today. | "morning triage" |
| `leverage-radar` | Ranks the next things worth automating or fixing, by payoff. | "what should I automate next" |
| `usage-insights` | Shows how you are actually using Claude Code and which skills earn their keep. | "usage insights" |

## Operate your stack  (Needs key)
| Skill | What it does | Needs |
|---|---|---|
| `n8n-execs` | Inspects your n8n automations: recent runs, errors, what is firing, health. | n8n API URL + key |
| `pipedrive` | Read-only CRM lookups: deals, pipeline value, contacts, overdue activities. | Pipedrive domain + token |
| `clickup-searcher` | Query, search, comment on, and update ClickUp tasks and lists via the API. | ClickUp token |
| `pp-firecrawl` | Scrape, crawl, map, or extract structured data from any website. | Firecrawl key |
| `playwright-driver` | Drives a real browser for screenshots, console checks, and scripted clicks on logged-in UIs. | none (installs a browser) |

## Think and capture
| Skill | What it does | Say this |
|---|---|---|
| `decide` | Thinks a real decision through from every angle: build vs buy, hire or not, is it worth it. | "help me decide between…" |
| `grill-me` | Interviews you to get a process out of your head and into written memory. | "grill me about my onboarding" |

## System
| Skill | What it does | Say this |
|---|---|---|
| `getting-started` | The guided tour. Sets up your memory and shows the payoff, one step at a time. | "getting started" |
| `new-project` | Starts tracking a new project or area of your work in the system. | "start a new project" |

## How to adapt a skill to you
The skills are ready as-is. What makes the system feel like *yours* is the memory. Run
`getting-started` to write your first facts, and any time you correct Claude or make a
decision, it offers to save that so it sticks. Over time the memory becomes the part no
generic setup can copy.
