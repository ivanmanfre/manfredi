# content-engine-starter

The skeleton of the system I run my own LinkedIn on. One idea goes in, a post in your voice comes out, and the lead magnet gets built behind it. You approve, it ships.

This kit gives you the core: the prompts, the anti-slop rules, the pillars, and the scoring rubric. It is the starter version. The tuned canon, the full lint engine, the lead-magnet builder, and the install are the paid layer (see the bottom).

## Install

```
/plugin marketplace add ivanmanfre/manfredi
/plugin install content-engine-starter@manfredi
```

Then run `/content-engine-starter:content-engine-starter` and Claude walks you through the build order, or work the files directly.

## What's in here

All files live in `skills/content-engine-starter/`:

```
prompts/
  1-context.md             pull the real material a post is built on
  2-format-router.md       decide text / image / carousel / lead magnet
  3-hook-batch.md          write a batch of hooks, keep the strongest
  4-voice-draft.md         draft the full post in your voice
  5-qa-9dim.md             score the draft on 9 dimensions, fix the weak spots
  6-deslop.md              strip the lines that read like AI
voice-profile-template.md  capture your voice once, feed it to step 4
anti-slop-checklist.md     the patterns that make writing sound like a machine
pillars.md                 what to post about, and how often
scoring-rubric.md          decide which ideas are worth writing
n8n-starter.json           a minimal workflow skeleton to wire it together
```

## Build order

1. **Fill out `voice-profile-template.md` first.** Nothing sounds like you until this exists.
2. **Set up your memory.** Drop your last 20-50 best posts and a few call transcripts somewhere the prompts can read them.
3. **Run the prompts in order, by hand first.** Get the output good manually. Automation only multiplies what already works.
4. **Add the gate.** `anti-slop-checklist.md` is the moat. Run it as a real pass (regex + a re-read), not vibes.
5. **Wire it up.** `n8n-starter.json` is the skeleton. Swap a different model per step, never one giant call.

## The one rule that matters

People do not catch AI with a detector. They catch sameness. Your voice is the asset. The system does everything the reader never sees. The second it touches the thing with your name on it, you put the one take only you would say back in.

## Want the real thing instead of building it

The version I run has a tuned voice canon, a deterministic lint engine with feed-level quotas, a self-publishing lead-magnet builder, and buyer-fit scoring calibrated on real outcomes. If you run an agency and you're the only one bringing in deals, I'll install the whole engine in your voice. Book a free fit call: **[ivanmanfredi.com/start](https://ivanmanfredi.com/start/)**
