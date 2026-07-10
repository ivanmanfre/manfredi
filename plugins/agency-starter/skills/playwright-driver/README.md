# playwright-driver

A Claude Code skill for driving Playwright via disposable Node scripts. Two modes:

- **Inspect** — multi-viewport screenshots, console errors, DOM probes on any URL. Stateless.
- **Drive** — scripted actions against logged-in UIs using persistent Chromium profiles per service.

Below, `<skill-dir>` = the directory this README lives in. Use the actual path on your machine; never hardcode someone else's home directory.

## Setup (one-time)

Install Playwright locally inside this skill folder so scripts run from anywhere without `NODE_PATH` setup:

```bash
cd <skill-dir>
npm install playwright
npx playwright install chromium
```

The templates resolve Playwright from `<skill-dir>/node_modules/playwright` first, then fall back to a normal `require('playwright')`, so a project-level or global install also works.

Verify:

```bash
ls <skill-dir>/templates/                 # inspect.js  drive.js
node -e "require('<skill-dir>/node_modules/playwright')" && echo ok
```

## Bootstrap a new service profile

```bash
PW_DRIVE_CONFIG='{"service":"<name>","bootstrap":true,"login_url":"<url>","login_complete_selector":"<selector>"}' \
  node <skill-dir>/templates/drive.js
```

Browser opens. Log in manually. The profile saves to `<skill-dir>/.playwright-profiles/<name>/`. If `login_complete_selector` never matches but you've clearly logged in, kill the script — the profile is already persisted during navigation.

> Profiles hold live session cookies. Keep `.playwright-profiles/` out of version control (a `.gitignore` is included).

## Quick examples

**Inspect any URL at default viewports (375 / 768 / 1440):**

```bash
PW_INSPECT_CONFIG='{"url":"https://example.com"}' \
  node <skill-dir>/templates/inspect.js | tail -n 1 | jq .
```

**Inspect with DOM probes:**

```bash
PW_INSPECT_CONFIG='{"url":"http://localhost:3000","viewports":[1440],"probes":{"header":["style","rect"]}}' \
  node <skill-dir>/templates/inspect.js | tail -n 1 | jq .
```

**Drive — scripted action** (copy template, fill in `action`, run):

```bash
cp <skill-dir>/templates/drive.js /tmp/pw-my-task.js
# edit /tmp/pw-my-task.js — replace the `action(page, args)` body
PW_DRIVE_CONFIG='{"service":"my-service","action_args":{"id":"..."}}' node /tmp/pw-my-task.js
```

## Where things live

| What                                 | Path                                          |
| ------------------------------------ | --------------------------------------------- |
| Skill metadata + decision tree       | `<skill-dir>/SKILL.md`                        |
| Templates                            | `<skill-dir>/templates/`                      |
| Local Playwright install             | `<skill-dir>/node_modules/`                   |
| Persistent profiles                  | `<skill-dir>/.playwright-profiles/<service>/` |
| Per-run output (screenshots, errors) | OS temp dir under `pw-out/<timestamp>/`       |
| Disposable per-task drive scripts    | a temp file, e.g. `/tmp/pw-<name>.js`         |

Override the profiles location with `PW_PROFILES_DIR` and the output location with `PW_OUT_DIR`.

## Upgrading Playwright

```bash
cd <skill-dir>
npm install playwright@latest
npx playwright install chromium
```
