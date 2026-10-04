# LinkedIn Next Post

A Claude Code mod that offers the next 3 content steps after Claude writes a LinkedIn draft, as one-key buttons.

```
Next   a: Hook that fits above the fold   s: Turn it into a carousel   d: Replies to 3 objections   x: Hide
```

Write a post with Claude as you usually do. When Claude finishes, a row of buttons shows above the prompt. Press `a`, `s` or `d` (or click one) and that step goes to Claude as your next prompt. It works in the Claude Code terminal and in the Code tab of the Claude Desktop app.

## The steps

The mod picks 3 from what the draft is:

| Step | When it is offered |
|---|---|
| Pick the strongest draft | Claude wrote several drafts |
| Hook that fits above the fold | The phone fold cuts the hook mid-sentence |
| Turn it into a carousel | The post has a list (and as a later pick for any post) |
| Replies to 3 objections | Always: the comments a skeptic would leave, and your replies |
| Shorter version | The post is over 1,300 characters |
| 5 more hooks | Claude wrote one draft |
| First comment with the link | The post has a link in it |

The answer to a step does not offer that same step again. Picking needs no model call, so the buttons show at once and cost nothing.

| Key | What it does |
|---|---|
| `a` `s` `d` | Send that step to Claude |
| `x` | Hide the buttons |

To use the keys, click the band or press `ctrl+x` then `tab`. The buttons clear when you send your next prompt. `/next-post` shows them again for the last draft.

## What it can and cannot do

- It reads Claude's answers in this session. It writes nothing and saves nothing.
- It makes no network calls. A press sends one prompt to Claude in your session, which you see in the transcript. `claude plugin validate ./linkedin-next-post` lists every event and call the mod uses.

## Install

Needs **Claude Code 2.1.287 or newer** (`claude --version`), in the terminal or in the Code tab of the Claude Desktop app.

```
/plugin marketplace add ivanmanfre/manfredi
/plugin install linkedin-next-post@manfredi
```

Or try it for one session from a downloaded copy: `claude --plugin-dir ./linkedin-next-post`

Made by [Ivan Manfredi](https://ivanmanfredi.com). We run LinkedIn inbound for agency founders: the posts, the comments and the DMs. See how it works: **[ivanmanfredi.com/start](https://ivanmanfredi.com/start/)**
