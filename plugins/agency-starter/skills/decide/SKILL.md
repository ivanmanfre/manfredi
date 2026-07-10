---
name: decide
description: Use when the user faces a real decision and wants help thinking it through — triggers include "help me decide", "should I X or Y", "is it worth it", "build vs buy", "should I hire for this", "weigh this for me", "I'm torn between". Analyzes the call from several angles, including the case against, then gives a clear recommendation.
---

# decide — think through a big decision

A structured second opinion for real decisions ("build this myself or hire it out?", "is this tool worth $X/mo?", "take this client or not?"). Instead of a gut take, it weighs the call from several distinct angles — including the strongest case *against* — then commits to a clear recommendation.

## How to run this (instructions to you, Claude)

First, **get the decision sharp** (one or two quick questions if needed): what exactly is being decided, the options on the table, and what "success" looks like for him.

Then work through these **lenses, one at a time** — a short, honest read on each (don't pad; if a lens doesn't apply, say so and move on):

1. **Money** — real cost of each option, including the cost of *not* deciding.
2. **Time & effort** — what each option takes from him, and how soon it pays off.
3. **Risk** — what could go wrong with each, and how bad.
4. **Reversibility** — if he's wrong, how easily can he undo it? (Cheap-to-reverse decisions deserve less agonizing.)
5. **Opportunity cost** — what each option blocks or rules out.
6. **The skeptic** — deliberately argue the *strongest case against* his leaning option. If he's leaning "build it", argue "buy/hire". This is the most important step — don't skip it or go soft.

Then **decide**:

```
✅ Recommendation: <option>
Confidence: <low / medium / high>
Why: <2-3 lines tying the lenses together>
The one thing that would change this: <the key uncertainty to resolve>
```

## Rules
- **Commit to a recommendation.** "It depends" is a cop-out — say what you'd do and why, then name the assumption it rests on.
- **The skeptic lens is mandatory.** A decision that hasn't been argued against hasn't been tested.
- **Match depth to stakes.** A reversible $50/mo trial gets three lines; a hire or a big build gets the full pass.
- **Plain English.** He's the decision-maker; you're the sounding board.

> Note: this is a single-session version of a heavier multi-angle decision tool — same thinking (multiple lenses + an adversarial check), done in one conversation.
