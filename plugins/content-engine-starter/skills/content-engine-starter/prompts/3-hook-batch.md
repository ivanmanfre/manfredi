# Step 3 — Hook batch

**Job:** the first line decides whether anyone reads the rest. Write a batch, then keep the one that earns the scroll-stop. One hook attempt is how you get a mediocre hook.

**Inputs:**
- `{{IDEA}}`, `{{CONTEXT}}`, `{{VOICE_PROFILE}}`

**Prompt:**

```
Write 8 opening lines for a LinkedIn post on this idea, then pick the best.

IDEA: {{IDEA}}
CONTEXT: {{CONTEXT}}
VOICE: {{VOICE_PROFILE}}

Rules for every hook:
- One line. A cold reader who's never heard of me must get why to keep reading.
- Lead with something concrete: a number, a real moment, a flat opinion.
- No "Most people think...", no questions, no "Here's the thing", no em dashes.
- It must be true to the context above. No hype the post can't back up.

After the 8, pick the ONE that a busy buyer would stop for, and say in one
line why it beats the others. If none are strong, write 4 more.

Return: the 8 (or 12), then WINNER + reason.
```

**Why a batch:** the gap between your 1st hook and your 7th is usually the gap between ignored and read. Generate wide, keep narrow.
