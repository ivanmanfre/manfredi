# Step 5 — QA, 9 dimensions

**Job:** score the draft like a tough editor, then rewrite only the weak spots. This catches the soft, "fine but forgettable" draft before it ships.

**Inputs:** `{{DRAFT}}` (step 4), `{{VOICE_PROFILE}}`

**Prompt:**

```
Score this draft 1-10 on each dimension. Be harsh. Then rewrite the
weakest 2-3 lines without touching what already works.

DRAFT:
{{DRAFT}}

VOICE: {{VOICE_PROFILE}}

Dimensions:
1. Hook       does the first line stop a busy reader?
2. Voice      does it sound like the profile, or like a generic model?
3. Specificity is there a real number, name, or moment, or just claims?
4. Substance  would the reader learn or feel something they didn't before?
5. Opinion    is there a take someone could disagree with?
6. Structure  one idea carried through, no rambling?
7. Rhythm     varied sentence length, or metronomic?
8. Clarity    does a cold reader get it in one pass?
9. Close      ends on something concrete, not a platitude?

Output:
- the 9 scores with a 5-word reason each
- the 2-3 lines you rewrote, before and after
- VERDICT: SHIP / REWRITE / KILL
Any dimension under 6 = REWRITE. Two under 5 = KILL the angle, start over.
```

**Why 9 and not "looks good":** a single "is this good?" pass rubber-stamps everything. Scoring per dimension forces it to find the weak link.
