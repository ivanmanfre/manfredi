# LinkedIn Post Preview

A Claude Code mod that shows your LinkedIn post the way the feed shows it, cut at the "…see more" fold, before you post it.

Write a post with Claude in Claude Code as you usually do. When Claude finishes, a pane opens in Claude Code with:

- **The fold.** Your post on a feed card, cut where LinkedIn adds "…see more". Both views show 3 feed lines before "…see more", and a blank line counts as a line: about 54 characters per line on a phone and about 78 in the desktop feed (measured on the live feed, October 2026).
- **Every draft.** If Claude wrote 3 hook variants, you get 3 tabs. Press `1`, `2`, `3` to compare them.
- **The numbers.** Characters out of LinkedIn's 3,000, words, read time, and where the fold falls.
- **The markdown traps.** `**bold**`, `# headings`, `[links](url)` and `` `code` `` show up as raw symbols on LinkedIn. The pane tells you how many your draft has.
- **Copy.** Press `c` to copy the post with those symbols removed, ready to paste into LinkedIn.

| Key | What it does |
|---|---|
| `1`–`9` | Switch drafts |
| `m` | Mobile / desktop view |
| `f` | See more / see less |
| `c` | Copy the post (markdown symbols removed) |
| `Esc` | Back to the prompt |

## Commands

- `/preview` opens the pane for the last drafts. With no drafts yet, it previews Claude's last answer.
- `/preview <text>` previews any text you paste after it.
- `/preview-profile Your Name | Your headline` puts your name and headline on the preview card. It is saved for later sessions.

## Install

Requires **Claude Code v2.1.287 or later** (`claude --version`). Mods run in the Claude Code CLI and in the Code tab of the Claude Desktop app. They do not run in claude.ai chat.

From inside Claude Code:

```
/plugin install linkedin-preview --marketplace ivanmanfre/manfredi
```

Or from your shell:

```
claude plugin marketplace add ivanmanfre/manfredi
claude plugin install linkedin-preview@manfredi
```

Or try it for one session without installing, from a downloaded copy of this folder:

```
claude --plugin-dir ./linkedin-preview
```

Then ask Claude for a LinkedIn post, for example: `write 3 hook variants for a LinkedIn post about <your topic>`.

## How it finds your drafts

When your prompt mentions LinkedIn, the mod adds one line for Claude asking it to put each post draft in a ```` ```linkedin ```` block. That is how the mod knows exactly where each draft starts and ends. Nothing else in your prompt or in Claude's instructions changes, and prompts that do not mention LinkedIn pass through untouched.

## What it can and cannot do

- It reads Claude's answers in this session and draws a pane. It saves your name, headline and preferred view in Claude Code's plugin store on your machine.
- It makes no network calls, runs no programs, and sends nothing anywhere. `claude plugin validate ./linkedin-preview` lists every event and API call the mod uses, so you can check this before you install.
- The fold numbers are approximate. LinkedIn does not publish its rules and changes them without notice. The pane marks the fold with ≈.
- Mods are new, and Anthropic says the mod API can change between releases. Tested with Claude Code 2.1.288.

## Troubleshooting

- **No `/preview` command:** run `claude --version` and update if it is older than 2.1.287.
- **Mods do not load at all:** run `claude plugin test` in an empty folder. If it says the rollout switch is off, start `claude` once with network access and try again. Anthropic can also switch mods off remotely, and some users see that at launch.
- **No pane, only a summary line:** a pane that opens by itself needs a wide terminal (144+ columns). Run `/preview` to open it at any width.

Made by [Ivan Manfredi](https://ivanmanfredi.com). We run LinkedIn inbound for agency founders: the posts, the comments and the DMs. See how it works: **[ivanmanfredi.com/start](https://ivanmanfredi.com/start/)**
