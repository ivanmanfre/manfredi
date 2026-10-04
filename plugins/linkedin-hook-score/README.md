# LinkedIn Hook Score

A Claude Code mod that scores the hook of every LinkedIn draft against your own best posts.

The hook is what a phone shows above "…see more": the first 3 feed lines. Most hook advice is generic. This mod compares your new hook with the hooks of the posts that did best for you, and the ones that did worst, using your own numbers.

```
Hook score · learned from 48 of your posts
Draft 1  8/10  Opens on a money loss, like your top 3 posts
Draft 2  5/10  Starts with a question; your weaker posts open that way
Draft 3  7/10  Specific number, but the promise lands below the fold
```

Write a post with Claude as you usually do. When Claude finishes, this band shows above the prompt: one score from 1 to 10 per draft and one plain reason. It works in the Claude Code terminal and in the Code tab of the Claude Desktop app, and it uses your own Claude (no API key).

## Setup, once: teach it your posts

LinkedIn gives you two free exports. The mod joins them, so each of your posts gets its text and its numbers.

1. **Your numbers.** On LinkedIn, open your profile, then **Analytics** (Creator analytics) › **Content** › **Export**. You get a file like `Content_2025-10-05_2026-10-03_YourName.xlsx`. Its TOP POSTS sheet holds your top 50 posts of the year by engagements and by impressions. It has no post text.
2. **Your post text.** **Settings** › **Data privacy** › **Get a copy of your data**. Pick the files you want and tick **Posts** (or take the whole archive). LinkedIn emails you a `.zip` within minutes to a day. Its `Shares.csv` holds the text of every post you wrote.
3. Put both files in your project folder or leave them in Downloads, then run:

```
/hook-score-learn
```

It finds both files by their LinkedIn names. You can also name them: `/hook-score-learn ~/Downloads/Content_….xlsx ~/Downloads/Basic_LinkedInDataExport_….zip`.

**No exports yet?** Run `/hook-score-learn` anyway. It makes a `top-posts.md` file in your project folder: paste 5 to 20 of your best posts into it, one per section, with a line of `---` between them. Add lines like `impressions: 12400` or `engagements: 310` inside a post if you know them. Save it and run `/hook-score-learn` again.

The mod says what it read, for example `Learned from 48 of your posts, 31 with numbers.` Run it again any time to add newer posts.

## Commands

- `/hook-score-learn [file ...]` reads your exports or `top-posts.md` and saves your posts on this machine.
- `/hook-score` scores the last drafts again. `/hook-score <text>` scores any text you paste.
- `/hook-score-model haiku|sonnet|opus` picks the model that scores.
- `/hook-score-forget` deletes the posts it learned.

## How the score works

Each turn that produces a ```` ```linkedin ```` draft sends one short request to your own Claude: your best hooks with their numbers, your weaker hooks, and the new hooks. Claude answers with a score and a reason per hook. The same hook is never scored twice in a session.

The model is `haiku` by default: the fastest, and the lightest on your plan. `/hook-score-model sonnet` (or `opus`, or `haiku`) changes it.

When your prompt mentions LinkedIn, the mod adds one line for Claude asking it to put each draft in a ```` ```linkedin ```` block, so it knows where each draft starts and ends. linkedin-preview asks for the same thing, and when both are installed Claude reads the request once.

## What it can and cannot do

- It reads the files you point it at, and your drafts in this session. It saves your posts (the hook, the first 500 characters, the date and the numbers) in Claude Code's plugin store on your machine.
- The only call it makes is to your own Claude, through Claude Code, to score hooks. Nothing else leaves your machine. `claude plugin validate ./linkedin-hook-score` lists every event and call the mod uses.
- The score is Claude's judgment against your own posts. It is a second opinion, and it gets better with more posts and with numbers.
- A file over 4 MB cannot be read by a mod. LinkedIn's posts-only archive is small; if your full archive is bigger, unzip it and point the mod at `Shares.csv`.
- LinkedIn's export formats can change. This version reads the October 2026 formats.

## Install

Needs **Claude Code 2.1.287 or newer** (`claude --version`), in the terminal or in the Code tab of the Claude Desktop app.

```
/plugin marketplace add ivanmanfre/manfredi
/plugin install linkedin-hook-score@manfredi
```

Or try it for one session from a downloaded copy: `claude --plugin-dir ./linkedin-hook-score`

The band has no keys. `[-]` at its right folds it, and it clears when you send your next prompt.

Made by [Ivan Manfredi](https://ivanmanfredi.com). We run LinkedIn inbound for agency founders: the posts, the comments and the DMs. See how it works: **[ivanmanfredi.com/start](https://ivanmanfredi.com/start/)**
