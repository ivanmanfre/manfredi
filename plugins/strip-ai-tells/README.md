# strip-ai-tells

A line editor that finds the 14 tells that make AI-written copy obvious and rewrites them out. This is the actual skill running in my clients' content systems, published as-is.

When you tell a model to "sound less like AI," it keeps every tell and adds adjectives to compensate. The fix is mechanical: name the 14 patterns, give the rewrite rule for each, and the job becomes search-and-strip, which models do near-perfectly.

One client's posts were dying at zero reach because they read like a corporate newsletter. Same voice inputs, same model. We added the strip-list, the posts started passing as his own writing, and he now spends about 10 minutes a week approving them.

## Install

```
/plugin marketplace add ivanmanfre/manfredi
/plugin install strip-ai-tells@manfredi
```

## Use

Paste any draft and say `strip the AI tells from this`. You get back:

- the cleaned draft, meaning and numbers preserved
- a one-line-per-fix list: `Tell N: <old> -> <new>`

Run it before any human reads the draft, so your editor only ever sees copy that has already lost its tells. The manual version of this pass is 20 to 30 minutes per post. The skill does it in one.

## The 14 tells it strips

Corrective-contrast flips, era-setting openers, inflated value verbs, rule-of-three triads, dramatic em-dash pauses, adjective stacking, hedge throat-clears, Latinate connectors, hollow wrap-ups, fake-intimacy pivots, audience catch-alls, over-hedged claims, symmetrical rhythm, and decorated bullets. Each has a find rule and a fix rule; the full list is in the skill.

## Want your whole pipeline to pass

This linter is one gate of a larger engine: voice canon, 9-dimension QA, feed-level pattern quotas. I install the full system for agencies. Book a free fit call: **[ivanmanfredi.com/start](https://ivanmanfredi.com/start/)**
