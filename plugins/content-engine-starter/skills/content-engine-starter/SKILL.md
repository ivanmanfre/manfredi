---
name: content-engine-starter
description: Use when the user wants to set up or run the content engine starter — triggers include "set up the content engine", "content engine starter", "run my post pipeline", "help me build my LinkedIn engine", "walk me through the content kit", or asking how to turn one idea into a post in their voice. Guides the build order (voice profile → memory → prompts 1-6 → anti-slop gate → n8n wiring) and can run the six pipeline prompts on an idea by hand.
---

# Content Engine Starter — Operator

You help the user stand up and run the starter version of a Claude-run LinkedIn content engine. All working files live in this skill's directory.

## The pipeline

```
ideas (calls, web, past winners)
   → scoring-rubric.md          keep the ideas the buyer would care about
   → prompts/1-context.md       ground it in real material
   → prompts/2-format-router.md pick text / image / carousel / lead magnet
   → prompts/3-hook-batch.md    write a batch of hooks, keep the strongest
   → prompts/4-voice-draft.md   draft the full post in the user's voice
   → prompts/5-qa-9dim.md       score on 9 dimensions, fix the weak spots
   → prompts/6-deslop.md        strip the lines that read like AI
   → user approves              the only manual step
```

## How to help, by request

**"Set me up" / first run:** walk the build order. (1) Copy `voice-profile-template.md` into their project and interview them to fill it — nothing sounds like them until this exists. (2) Have them point you at 20-50 of their best posts and a few call transcripts. (3) Copy `pillars.md` and `scoring-rubric.md` into the project and tune both to their business. Do one step at a time and confirm before moving on.

**"Run this idea":** take one idea through prompts 1 → 6 in order, using their filled voice profile and pillars. Show the output of each stage briefly, full text for the final draft. Then run `anti-slop-checklist.md` against the draft as a real pass (pattern check plus a re-read), list what it caught, and return the cleaned draft for approval. Never skip the checklist: a model is the worst judge of its own slop.

**"Wire it up":** hand them `n8n-starter.json` and explain the skeleton. One model call per step, never one giant call. Automation only multiplies what already works by hand, so refuse to help automate a pipeline they have not run manually at least once.

## Hard rules
- The user's voice profile and approved past posts are the source of voice. Never substitute a generic professional tone.
- No invented numbers, clients, or outcomes in any draft. If a claim needs a fact the user has not given, mark it [ADD A NUMBER HERE] and ask.
- The user approves every post. Never present a draft as ready to publish.
