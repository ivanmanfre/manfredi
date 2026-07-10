# Anti-slop checklist

The gate that keeps output off the AI pile. People don't catch AI with a detector, they catch sameness. These are the patterns that create it.

This is the core, public set. The engine I run uses a deterministic linter (currently v9) with ~70 word bans, structural caps, and feed-level quotas that stop your last 10 posts from sharing a skeleton. This starter catches the loudest tells.

## Run it as code (drop into any JS step)

```js
const HARD_FAILS = [
  { name: "em_dash", re: /[—–―]|--/, fix: "commas, colons, or split the sentence" },
  { name: "not_just_but", re: /not just [^.!?\n]{1,50},? but/i, fix: "state the point once" },
  { name: "corrective_contrast", re: /\b(is|was|are|were)n'?t\b[^.!?\n]{1,60}[.!?]\s+(It|That|This|The)\b[^.!?\n]{0,80}\b(is|was|'s|'re|are)\b/i, fix: "drop the 'isn't X, it's Y' reframe" },
  { name: "suspense_setup", re: /here'?s (the (thing|kicker|catch|twist|secret|part)|what (happened|nobody tells you))/i, fix: "deliver the payoff directly" },
  { name: "nobody_reveal", re: /the (part|thing) (nobody|no one) (talks about|tells you|warns you|prices in)/i, fix: "just say it" },
  { name: "staged_silence", re: /the room went (quiet|silent)|then it clicked|that's when it hit me/i, fix: "write what actually happened" },
  { name: "memo_label", re: /^\s*(The\s+)?(Problem|Solution|Result|Takeaway|Lesson|Context|TL;?DR)\s*:/im, fix: "write a real opening line, not a label" },
  { name: "comment_bait", re: /tag a founder|save this( post)?|bookmark this|comment early/i, fix: "cut it" },
  { name: "claude_isms", re: /\b(delve|leverage|harness|seamless|robust|holistic|unlock|elevate|streamline|underscores?|testament to|game.?chang|cutting.?edge|in today'?s (fast-paced|world)|evolving landscape|multifaceted)\b/i, fix: "use a plain word" },
];

function lint(text){
  return HARD_FAILS.filter(p => p.re.test(text)).map(p => `${p.name}: ${p.fix}`);
}
// lint(draft).length === 0  →  passes the core gate
```

## Structural rules (judgment, not regex)

- **Corrective contrast: max 1 per post.** "Isn't X, it's Y", "not a X, a Y", "stop X start Y" are all the same move. Never as the opener or the closer.
- **Demonstrative pivot: max 1.** "That's the real problem", "that's where it starts". Let the next concrete detail carry it instead.
- **No three stacked fragments.** "Every test. Every metric. Every call." reads as AI cadence. Collapse to one sentence, or use an arrow list.
- **Vary sentence length.** If every sentence is the same length, it reads metronomic. Mix a 3-word line with a 20-word one.
- **No wall of text.** No paragraph over ~3 sentences. Break dense blocks. Drop in one short line to break the rhythm.
- **Close on something real.** A number, an instruction, or an open question tied to the post. Not a quotable aphorism.

## The one that isn't a rule

After every automated pass, read it once as a human and ask: *could this exact post have appeared under anyone else's name, about anything?* If yes, it failed, even if it passed every regex above. Put your specific take back in.
