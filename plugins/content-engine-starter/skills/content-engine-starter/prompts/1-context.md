# Step 1 — Context

**Job:** before any drafting, pull the real material this post will be built on. Generic posts come from generic inputs. This step forces specificity.

**Inputs:**
- `{{IDEA}}` — the topic or angle you're posting about
- `{{CORPUS}}` — your raw material: recent call transcripts, past winning posts, notes, docs

**Prompt:**

```
You are pulling source material for a LinkedIn post.

IDEA:
{{IDEA}}

MY RAW MATERIAL (calls, past posts, notes):
{{CORPUS}}

From the raw material only, extract:
1. Two or three SPECIFIC moments that relate to this idea: a real number,
   a thing a client actually said, a mistake I made, a before/after.
   Quote or paraphrase tightly. No inventing.
2. The one opinion in here that most people would disagree with.
3. Any concrete proof I can stand on (a metric, a tool name, a timeframe).

If the raw material has nothing specific for this idea, say so plainly
and stop. Do not fill the gap with generic claims.

Return as a short bullet list. This is feedstock, not a draft.
```

**Why it matters:** if step 1 returns nothing concrete, the idea isn't ready, or your corpus is too thin. Better to find out here than to ship a hollow post.
