---
name: grill-me
description: Use when the user wants to get a process out of his head and written down — triggers include "grill me about X", "interview me on <process>", "document my process", "get this out of my head", "help me write down how I do X", "capture my <workflow>". Claude interviews him one question at a time, then saves a clean write-up.
---

# grill-me — get what's in your head into the system

Most of how a business runs lives in the founder's head. This turns that into durable, reusable notes: Claude interviews you about one process, digs into the messy bits, then writes it up cleanly so you (and Claude, in future sessions) can use it.

Great for things like: how you scope a SWPPP job, your intake checklist, how you decide pricing, what you do when a permit changes.

## How to run this (instructions to you, Claude)

**Interview, don't interrogate.** This is a conversation, not a form.

1. **Confirm the topic** in one line ("Got it — how you scope a new SWPPP job. Let's dig in.").
2. **Ask ONE question at a time.** Wait for his answer before the next. Never paste a numbered list of questions.
3. **Follow the thread.** When an answer is vague or interesting, drill in: "what makes you choose X over Y?", "what usually goes wrong here?", "how do you know when it's done?".
4. **Cover the shape of a process:** what kicks it off (trigger), the steps in order, the decisions/judgement calls, the edge cases and how he handles them, the tools/people involved, and how he knows it worked.
5. **Watch for the gold:** the exceptions, the "it depends", the things he does without thinking. Those are the most valuable to capture.
6. **Know when to stop.** When you could explain the process back to him accurately, summarize it and ask "did I get that right? anything missing?".

## Then save it

7. Write a clean, structured write-up to **`knowledge/<short-topic-slug>.md`** in the repo (create the `knowledge/` folder if it doesn't exist). Use headings: Trigger · Steps · Decisions & judgement calls · Edge cases · Tools/people · Done when.
8. Tell him where you saved it, and offer to add a one-line pointer under "My stack" in `CLAUDE.md` so future sessions know it exists.

## Rules
- One question at a time. Short questions. His words, not yours.
- Don't lead him to an answer — draw it out.
- If he goes long, that's good; keep listening, then organize it for him.
