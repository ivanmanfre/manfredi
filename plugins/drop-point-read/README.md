# drop-point-read

A Claude system that reads one sales call transcript and names the exact line where your deal slipped. Built for agency owners and ops leads at $1-10M service firms.

You ran 20+ calls last month and reviewed maybe one. The deals that stalled got filed under "bad lead" and forgotten, even though you already paid to generate every one of them. This reads the actual transcript and points at the line, scored against your own best closes.

## Install

```
/plugin marketplace add ivanmanfre/manfredi
/plugin install drop-point-read@manfredi
```

## Quick start

1. **Calibrate it once (about 10 minutes).** The skill scores against YOUR winning calls, so give it some: on first run it will offer to create `drop-point/context/` in your project with two files to fill in: `best-closes.md` (2-3 winning calls, the 5 minutes around each close is enough) and `offer-and-voice.md` (your offer, price, and how you sound).
2. **Run it.** Say `Run the drop-point read on this transcript:` and paste a call.
3. **Get the read back.** The drop point with a line cite, the five-read score table, the unhandled objection threads, and one follow-up line ready to send.

Skip calibration and it scores against the built-in strong-close standard, and says so at the top of the report.

## What's inside

- `skills/drop-point-read/SKILL.md` — the orchestrator
- `system/five-reads-rubric.md` — the five scoring reads with 0-5 anchors
- `system/drop-point-method.md` — the step-by-step method
- `system/output-format.md` — the exact report shape
- `context/` — templates for your calibration files

Run it on every call your team ran last month. The drop points will repeat. That pattern is the thing quietly costing you closes.

## Want the reads done for you

I build call-intelligence systems for agencies: every call read automatically, patterns surfaced weekly. Book a free fit call: **[ivanmanfredi.com/start](https://ivanmanfredi.com/start/)**
