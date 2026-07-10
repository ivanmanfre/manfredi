# Step 2 — Format router

**Job:** decide what this idea should become before you write it. Forcing the format up front stops you from defaulting to a text post every time.

**Inputs:**
- `{{IDEA}}`
- `{{CONTEXT}}` — the output of step 1

**Prompt:**

```
Decide the best format for this idea. Pick ONE and justify in one line.

IDEA: {{IDEA}}
CONTEXT: {{CONTEXT}}

Options:
- TEXT: a single opinion, story, or teardown. Default when the value is the take.
- IMAGE: one idea that lands harder as a visual (a number, a before/after, a diagram).
- CAROUSEL: a sequence with 4+ steps or a framework worth swiping through.
- LEAD MAGNET: the idea is a usable tool/checklist/template someone would trade an email for.

Rules:
- If the value is "here's how I think about X", that's TEXT.
- If the idea is a process with steps, that's CAROUSEL.
- If a reader could DO something with it, consider LEAD MAGNET.
- Do not pick CAROUSEL just to look effortful.

Return: FORMAT + one-line reason.
```

**Note:** in the full engine this routes to different downstream builders. In the starter, it just tells you which way to draft.
