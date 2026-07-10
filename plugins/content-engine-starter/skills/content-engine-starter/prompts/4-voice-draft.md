# Step 4 — Voice draft

**Job:** write the full post so it sounds like you, not like a model. This is where the voice profile earns its keep.

**Inputs:**
- `{{WINNING_HOOK}}` (step 3), `{{CONTEXT}}` (step 1), `{{VOICE_PROFILE}}`, `{{FORMAT}}` (step 2)

**Prompt:**

```
Write the full LinkedIn post.

HOOK (use as the first line, or sharpen slightly):
{{WINNING_HOOK}}

CONTEXT (the only facts you may use):
{{CONTEXT}}

MY VOICE:
{{VOICE_PROFILE}}

FORMAT: {{FORMAT}}

Rules:
- Sound like the voice profile. Match its rhythm, its register, its tics.
- Use ONLY the facts in context. Invent nothing. No fake clients, no made-up numbers.
- Short paragraphs, 1-3 sentences. Vary sentence length on purpose.
- One clear idea, carried start to finish. No feature-dumping.
- Plain language a busy operator reads in one pass.
- End on a number, an instruction, or an open question tied to the post. Not an aphorism.

Leave a blank line where my personal take should go, marked [YOUR TAKE HERE].
The model writes everything except the one line only I would say.
```

**The discipline:** never let it write the line with your name's weight on it. The `[YOUR TAKE HERE]` marker is deliberate. That single human line is most of why anyone trusts the post.
