# LinkedIn Voice Guard

A Claude Code mod that flags the phrases that make a LinkedIn draft sound AI-written, before you post it.

```
Voice guard · Draft 1: 2 flags · Draft 2: clean
D1 L5   That's not caution. It's fear.                   not X, it's Y
D1 L9   You compete on a spreadsheet, not on trust       X, not Y
r: Rewrite flagged lines
```

Write a post with Claude as you usually do. When Claude finishes, a band above the prompt counts the flags in each draft and shows each one in its line, with the words that fired highlighted. Press `r` and Claude rewrites only those lines and keeps the rest word for word. It works in the Claude Code terminal and in the Code tab of the Claude Desktop app.

## What it flags

- **Built-in checks:** em dashes; contrast lines ("not just X but Y", "it's not X, it's Y", "X isn't Y. Z is.", "Not because X. Because Y.", "X, not Y", "Instead of X, do Y", "less X, more Y", "stop X, start Y"); and three short fragments in a row ("Clear. Simple. Effective."). Three short questions, and a run of numbers ("Sales grew 3.8%. Costs grew 1%."), are left alone.
- **Words and phrases:** delve, in today's fast-paced, game-changer, unlock, leverage, seamless, elevate, supercharge, here's the thing, let that sink in, unpopular opinion, deep dive, tapestry, a testament to, and 17 more. A word also flags its forms: "unlock" flags unlocks and unlocking.

The matching is plain text matching: the same draft always gets the same flags, and nothing is sent anywhere to check it.

## Your rules

The rules live in a text file you can open and edit:

`~/.claude/linkedin-mods/voice-guard-rules.txt` (on Windows, in your user folder under `.claude\linkedin-mods`)

One rule per line. Delete a line to stop flagging it. Lines that start with `#` are notes. A line that starts with `re:` is a pattern, for example `re:\bsynerg\w*`.

- `/voice-guard-add <phrase>` adds a rule.
- `/voice-guard-remove <phrase>` removes one (also a built-in check, for example `/voice-guard-remove @em-dash`).
- `/voice-guard-rules` lists the rules and the file's path.
- `/voice-guard` checks the last drafts again. `/voice-guard <text>` checks any text you paste.

The file is written once, with the defaults, the first time the mod runs. A later version with new defaults does not change your file: delete it to get the newest list.

| Key | What it does |
|---|---|
| `r` | Rewrite flagged lines: Claude rewrites only those lines in its next answer |
| `v` | Show all flags (when there are more than 3) |

To use the keys, click the band or press `ctrl+x` then `tab`. Clicking a button works too. The band clears when you send your next prompt.

## What it can and cannot do

- It reads Claude's answers in this session and your rules file. It writes only the rules file.
- It makes no network calls and sends nothing anywhere. Pressing `r` sends one prompt to Claude in your session, which you see in the transcript. `claude plugin validate ./linkedin-voice-guard` lists every event and call the mod uses.
- A flag means: read this line again. Some of these words are fine in your voice: remove them from your rules.

## Install

Needs **Claude Code 2.1.287 or newer** (`claude --version`), in the terminal or in the Code tab of the Claude Desktop app.

```
/plugin marketplace add ivanmanfre/manfredi
/plugin install linkedin-voice-guard@manfredi
```

Or try it for one session from a downloaded copy: `claude --plugin-dir ./linkedin-voice-guard`

Made by [Ivan Manfredi](https://ivanmanfredi.com). We run LinkedIn inbound for agency founders: the posts, the comments and the DMs. See how it works: **[ivanmanfredi.com/start](https://ivanmanfredi.com/start/)**
