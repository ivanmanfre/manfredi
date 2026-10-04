# LinkedIn Pipeline

A Claude Code mod that shows your leads, replies and booked calls in a pane, read from files you export yourself.

```
Last 30 days
From messages.csv, Connections.csv, read today

4 leads    2 replies (50%)    1 booked call (25%)    2 new connections

Booked
Ben Ode   Great, here is my link: https://cal.com/…   13d ago

Replied, no call yet
Cy Park   Thanks Cy! I check the fold first, then…    3d ago

w: 90 days   l: Read the files again
```

It works in the Claude Code terminal and in the Code tab of the Claude Desktop app.

## The files it reads

- **Your LinkedIn data.** **Settings** › **Data privacy** › **Get a copy of your data**, with **Messages** and **Connections** ticked. LinkedIn emails you a `.zip`. Point the mod at the zip, or unzip it and point it at `messages.csv` and `Connections.csv`.
  - Each conversation with one other person is a lead. It is a reply once both of you wrote. It is a booked call once a message holds a booking link (cal.com, Zoom, Google Meet, Teams, SavvyCal and others) or says the call is booked.
  - You are found as the sender who appears in the most conversations. Group chats are left out.
- **A CSV from your CRM.** Any CSV with a stage or status column (`Stage`, `Status`, `Deal stage`, `Lead status`). Stage words decide the column: replied, interested or engaged count as replies; meeting, call, demo, booked, proposal or won count as booked calls; lost and disqualified rows are left out. A name, company and date column are used when present.

## Commands

- `/pipeline` opens the pane. The first time it looks for the files in your project folder, then for your LinkedIn export in Downloads (a CRM CSV is read from the project folder or when you name it). After that it reads the same files again.
- `/pipeline <file ...>` reads the files you name, for example `/pipeline ~/Downloads/Basic_LinkedInDataExport_10-04-2026.zip`.

| Key | What it does |
|---|---|
| `w` | Switch the window: 7, 30 or 90 days |
| `l` | Read the files again |
| `Esc` | Back to the prompt |

## What it can and cannot do

- It reads the files you point it at. It saves only their paths, in Claude Code's plugin store, so `/pipeline` finds them next time.
- It makes no network calls and sends nothing anywhere, Claude included. `claude plugin validate ./linkedin-pipeline` lists every event and call the mod uses.
- A mod reads files up to 4 MB. A busy inbox makes a bigger `messages.csv`: export a shorter date range, or use a CRM CSV.
- The booked-call count comes from the words and links in your messages, so it can miss a call you set up by email or phone.

## Install

Needs **Claude Code 2.1.287 or newer** (`claude --version`), in the terminal or in the Code tab of the Claude Desktop app.

```
/plugin marketplace add ivanmanfre/manfredi
/plugin install linkedin-pipeline@manfredi
```

Or try it for one session from a downloaded copy: `claude --plugin-dir ./linkedin-pipeline`

Made by [Ivan Manfredi](https://ivanmanfredi.com). We run LinkedIn inbound for agency founders: the posts, the comments and the DMs. See how it works: **[ivanmanfredi.com/start](https://ivanmanfredi.com/start/)**
