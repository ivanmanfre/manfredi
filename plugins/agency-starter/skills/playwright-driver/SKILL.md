---
name: playwright-driver
description: Use when you need a browser to do precise, repeatable, or scripted work — multi-viewport frontend screenshots, console error capture, DOM inspection, or click-sequences against logged-in web UIs. Triggers — "screenshot this page at mobile/tablet/desktop", "check for console errors", "inspect the DOM / computed styles", "automate clicking through this logged-in app", "drive the browser". Prefer this over a heavyweight browser MCP when the task is repeatable or needs measurements a human can't easily produce.
---

# Playwright Driver

Drive Playwright via disposable Node scripts with structured JSON output. Two modes: **Inspect** (stateless, any URL) and **Drive** (persistent per-service login profile for scripted actions).

Templates live in this skill folder under `templates/`. Playwright is expected to be installed locally in this skill folder (see Setup), so scripts run from anywhere with no global setup.

## Setup (one-time)

Install Playwright + the Chromium browser into this skill folder:

```bash
cd <skill-dir>            # the folder this SKILL.md lives in
npm install playwright
npx playwright install chromium
```

The templates resolve Playwright from `<skill-dir>/node_modules/playwright` first, then fall back to a normal `require('playwright')` — so a project-level or global install also works.

Throughout this doc, `<skill-dir>` = the directory containing this SKILL.md. Use the actual path on your machine; never hardcode someone else's home directory.

## When to use which tool

| Need                                                                | Use                              |
| ------------------------------------------------------------------- | -------------------------------- |
| Ad-hoc clicking, "be a human," exploratory browser work             | a generic browser-control tool   |
| Multi-viewport screenshots / console errors / DOM probes on a URL   | **playwright-driver Mode 1 (inspect)** |
| Repeatable click-sequence against a logged-in UI                    | **playwright-driver Mode 2 (drive)**   |
| One-off browser action you'll never repeat                          | a generic browser-control tool   |
| Anything that should run headless and return structured data        | **playwright-driver**            |

If you find yourself reaching for a token-heavy browser MCP for a repeatable task, stop — use this skill instead.

## Mode 1: Inspect (frontend refinement)

**Template:** `<skill-dir>/templates/inspect.js`

Stateless. Run as-is. Pass config via `PW_INSPECT_CONFIG` env var as JSON.

```bash
PW_INSPECT_CONFIG='{"url":"<url>","viewports":[375,768,1440],"probes":{"<selector>":["style","rect","text"]}}' \
  node <skill-dir>/templates/inspect.js
```

**Config fields:**
- `url` (required) — full URL, e.g. `https://example.com` or `http://localhost:3000`
- `viewports` (optional) — array of widths in px. Default `[375, 768, 1440]`. Heights are auto.
- `probes` (optional) — `{ selector: ['style' | 'rect' | 'text'] }`. Run only on the smallest viewport.
- `headed` (optional) — `true` to show the browser window. Default headless.
- `waitFor` (optional) — selector to wait for after navigation, before screenshot.

**Output:** single JSON line on stdout. Parse with `tail -n 1 | jq .` or in code with `JSON.parse(stdout.trim().split('\n').pop())`.

```json
{
  "ok": true,
  "url": "...",
  "out_dir": "<tmp>/pw-out/<timestamp>",
  "screenshots": ["<tmp>/pw-out/<timestamp>/375.png", "..."],
  "console_errors": [{ "viewport": 375, "type": "error", "text": "...", "location": {} }],
  "network_failures": [{ "viewport": 1440, "url": "...", "status": 404 }],
  "probes": { "<selector>": { "style": {}, "rect": {}, "text": "..." } }
}
```

On failure: `{ "ok": false, "error": "...", "error_screenshot": "<tmp>/pw-out/.../error.png" }`.

Output goes to the OS temp dir under `pw-out/<timestamp>/` by default. Override with the `PW_OUT_DIR` env var.

**When to read screenshots vs trust the JSON:** read JSON first. Only `Read` a screenshot when the JSON suggests visual debugging is needed or the user explicitly asks to see it.

## Mode 2: Drive (logged-in scripted actions)

**Template:** `<skill-dir>/templates/drive.js`

This template is **copied per task** to a temp file (e.g. `<tmp>/pw-<descriptive-name>.js`). Edit the `action(page, args)` function in the copy. Never edit the template itself — selectors and click-sequences live in the per-task script.

### Where login profiles live

Persistent Chromium profiles are stored INSIDE this skill folder at `<skill-dir>/.playwright-profiles/<service>/` by default, so they travel with the repo and never leak into your home directory. Override the location with the `PW_PROFILES_DIR` env var.

Add `.playwright-profiles/` to `.gitignore` — these directories hold live session cookies and must NOT be committed.

### Bootstrap a service profile (one-time per service)

```bash
PW_DRIVE_CONFIG='{
  "service": "<service-name>",
  "bootstrap": true,
  "login_url": "<login URL>",
  "login_complete_selector": "<selector that appears only when logged in>"
}' node <skill-dir>/templates/drive.js
```

A Chromium window opens. Log in manually. When `login_complete_selector` appears, the script saves the profile to `<skill-dir>/.playwright-profiles/<service>/` and exits. If the selector never matches but you've clearly logged in (URL changed, dashboard visible), kill the script — the profile is already saved during navigation.

### Run a scripted action (after bootstrap)

```bash
cp <skill-dir>/templates/drive.js <tmp>/pw-<descriptive-name>.js
# Edit <tmp>/pw-<descriptive-name>.js — replace the `action(page, args)` body
PW_DRIVE_CONFIG='{"service":"<service>","action_args":{...}}' node <tmp>/pw-<descriptive-name>.js
```

**Config fields:**
- `service` (required) — folder name under the profiles dir
- `bootstrap` (optional) — `true` for first-time login flow
- `login_url`, `login_complete_selector` — used only when `bootstrap: true`
- `action_url` (optional) — initial navigation before `action(page, args)` is called
- `action_args` (optional) — passed as the second argument to `action`
- `headed` (optional) — force a visible window even outside bootstrap

**Output:** single JSON line.
- Success: `{ "ok": true, "service": "...", "result": <whatever action returned> }`
- Failure: `{ "ok": false, "error": "...", "screenshots_on_failure": [...] }`

### Action function pattern

```javascript
async function action(page, args) {
  await page.goto(`https://example.com/${args.id}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000); // SPAs need time after domcontentloaded
  // ...do stuff...
  return { /* structured result */ };
}
```

When the action throws, the template captures a full-page screenshot to `<tmp>/pw-out/<timestamp>/error.png` and returns `screenshots_on_failure`. Read that screenshot to see what the page looked like.

## Profile registry

Profiles live at `<skill-dir>/.playwright-profiles/<service>/`. Bootstrap one per logged-in service you want to drive (examples: a workflow tool, a project-management web app, a hosting dashboard, a community platform). Pick any short `service` name — it's just the folder name.

If a profile gets logged out (cookies expire), re-bootstrap that service.

## Output parsing convention

Both templates emit **one JSON line on stdout** as the last line. Bootstrap mode prints status to **stderr** so it doesn't pollute the JSON.

Shell:
```bash
node <skill-dir>/templates/inspect.js | tail -n 1 | jq .
```

JS:
```javascript
const result = JSON.parse(stdout.trim().split('\n').filter(Boolean).pop());
```

## Common pitfalls

- **Selectors drift.** When a target web app ships UI updates, selectors break. Re-run the action; if it fails, open `result.screenshots_on_failure[0]` to see the current page, then update the action function (NOT the template). Selector-drift is expected and lives in per-task scripts by design.
- **`networkidle` timeouts on heavy SPAs.** If a page never reaches `networkidle`, switch to `{ waitUntil: 'domcontentloaded' }` + an explicit `page.waitForTimeout(3000)` or `waitForSelector`.
- **Profile lock.** Only one process can use a profile at a time. If a previous run hung, kill any leftover Chromium processes before re-running.
- **Bootstrap selector never matches.** The `login_complete_selector` may not exist in the current UI version. The profile saves during navigation, so if you've clearly logged in, kill the bootstrap and verify with a smoke action (navigate somewhere, check `page.url()` doesn't redirect to a sign-in page).
- **Don't edit templates per task.** Copy `drive.js` to a temp file, edit the copy, run the copy. Templates stay generic.

## Visual / DOM pitfalls (hard-won)

- **Marquee over-counting.** DOM text probes on marketing pages may over-count testimonials, logos, or names that appear once visually — infinite-scroll marquees clone the track 2×–4× for seamless looping. Before reporting a "duplicate content bug" from scraped text, verify with a targeted DOM count (e.g. `document.querySelectorAll('[data-testid=testimonial-name]').length`) and confirm whether all matching elements share the same on-screen position. A uniform multiple (4×, 2×) across all items is almost certainly an animation artifact, not a content defect.
- **`file://` images via setContent.** When rendering HTML that references local image files (`file:///...` paths): do NOT use `page.setContent(html)` — the `about:blank` origin blocks `file://` resources and images fail silently. Instead, write the HTML to a temp file and call `page.goto('file:///absolute/path/to/file.html')`. Applies to any mockup-rendering script.
- **Scroll-reveal blind spot.** Full-page screenshots capture DOM-present-but-hidden sections (scroll-reveal animations at `opacity:0`) as blank whitespace. Before any full-page capture, run a scroll loop (step-scroll with `page.evaluate(() => window.scrollBy(0, 300))` in a loop) to trigger IntersectionObserver reveals, then screenshot. If a capture has unexpected blank bands, probe suspected elements with `getBoundingClientRect()` + `getComputedStyle` to distinguish render bugs from animation state.
- **Screenshot buffer encoding.** Playwright/Puppeteer `screenshot()` can return a `Uint8Array` (especially headless), not always a `Buffer`. Calling `.toString('base64')` on a `Uint8Array` produces comma-joined decimal bytes (e.g. `'137,80,78,...'`), not valid base64. Always wrap first: `Buffer.from(await page.screenshot()).toString('base64')` — safe in all cases.
- **Detect horizontal overflow programmatically.** On a mobile viewport (e.g. 390px), check `scrollWidth === innerWidth` in `page.evaluate()` — visual inspection alone misses partial overflows. Also: `scrollIntoView` on footer elements can land on a sticky docked bar; prefer `window.scrollTo(0, document.body.scrollHeight)` or target an element below the sticky zone.
- **Verify actual file type after capture.** Run `file <output>.png` before using the asset — captured pages can write JPEG data despite a `.png` extension. Rename to the correct extension before committing to avoid broken image rendering.
- **Blank capture ≠ confirmed render bug.** When a full-page screenshot comes back blank or missing content, run a DOM probe (computed opacity/visibility/text) BEFORE declaring a rendering bug. Blank captures are frequently scroll-timing artifacts; a DOM probe disambiguates in seconds.
- **Capture sections at native resolution.** Never declare a visual audit passing from a single full-page, scaled-down screenshot — capture each section at native viewport resolution. Always run a separate mobile (375px) pass for any page with count-up, scroll-triggered, or IntersectionObserver animations; in-view hooks reliably fail to fire on narrow viewports and render counters as 0 while a desktop run shows correct numbers.
- **Crop dashboards for mobile screenshots.** For a dashboard screenshot destined for a mobile layout, don't use a full-page/full-viewport capture — sidebar/chrome makes it unreadable. Instead: (1) launch at a mobile viewport (e.g. 390×844), (2) capture a focused region with `clip: {x, y, width, height}` aligned to the content (skip the left nav), (3) convert to WebP, (4) serve via a `<picture>` source swap. Verify crops are readable by reading the PNG back before converting.
- **Apostrophes crash `querySelector`.** Text containing an apostrophe is not a valid selector string (e.g. `'I'm here' is not a valid selector`). Use XPath (`//text()[contains(., "I'm")]`) or locate by a parent element/class instead of inlining the apostrophe text.

## Maintenance

Upgrade Playwright in this skill folder:

```bash
cd <skill-dir>
npm install playwright@latest
npx playwright install chromium
```
