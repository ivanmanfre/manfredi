# Step 6 — De-slop

**Job:** the last gate. Strip the patterns that make writing read like a machine, the ones a model leaves behind even in a good draft. Run this as a real pass, not a vibe check.

**Inputs:** `{{DRAFT}}` (post-QA), plus `anti-slop-checklist.md`

**Two-part pass. Do the deterministic part first.**

**Part A — regex/scan (catches what the model can't see in itself).**
Run the patterns in `anti-slop-checklist.md` against the draft. Every hit gets fixed before Part B. The big ones:
- em dashes → commas, colons, or split the sentence
- "it's not X, it's Y" / "not just X, but Y" → state the point once, directly
- "Here's the thing / what nobody tells you" → delete, deliver the payoff
- "the room went quiet", "then it clicked" → write what actually happened
- claude-isms (delve, leverage, seamless, underscores, testament to...) → cut

**Part B — model pass:**

```
Clean this draft of AI tells. Do not change the meaning or the voice.

DRAFT:
{{DRAFT}}

Remove or rewrite:
- any corrective-contrast reframe ("isn't X, it's Y") beyond one
- any suspense setup that delays the payoff
- any sentence that's a generic generalization with no concrete subject
- metronomic rhythm: if every sentence is the same length, break it
- any line that could appear on anyone's post about anything

Keep every specific number, name, and the personal take. Return the cleaned post only.
```

**The principle:** a model is the worst judge of its own slop. The deterministic scan in Part A is non-negotiable. The model pass alone will miss its own tells.
