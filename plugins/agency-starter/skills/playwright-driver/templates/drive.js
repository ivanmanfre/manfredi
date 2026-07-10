#!/usr/bin/env node
// Mode 2: Drive — persistent profile per service, scripted action against a logged-in UI.
// This file is a TEMPLATE. Copy it next to your work (e.g. a temp dir), fill in the `action` function, then run.
// Invocation: node drive.js (reads PW_DRIVE_CONFIG env var as JSON)
// Config shape: { service, bootstrap?: boolean, headed?: boolean, action_url?: string, login_url?: string, login_complete_selector?: string, action_args?: object }

const path = require('path');
const fs = require('fs');

// Resolve Playwright from this skill's local install (templates/ -> skill root -> node_modules),
// falling back to a normal require so a globally/locally installed playwright also works.
function loadPlaywright() {
  const skillRoot = path.resolve(__dirname, '..');
  const local = path.join(skillRoot, 'node_modules', 'playwright');
  try { return require(local); } catch (_) {}
  return require('playwright');
}
const { chromium } = loadPlaywright();

// Persistent browser profiles live INSIDE the repo by default so they travel with the project
// and never leak into the user's home dir. Override with PW_PROFILES_DIR.
// Default: <skill root>/.playwright-profiles/<service>/
const SKILL_ROOT = path.resolve(__dirname, '..');
const PROFILES_BASE = process.env.PW_PROFILES_DIR || path.join(SKILL_ROOT, '.playwright-profiles');

// Per-run output dir. Override with PW_OUT_DIR; defaults to the OS temp dir.
const OUT_BASE = process.env.PW_OUT_DIR || path.join(require('os').tmpdir(), 'pw-out');

// >>> EDIT THIS for each task. Receives (page, args) and returns the result object.
async function action(page, args) {
  // Example: navigate, click, assert, return data.
  // Throw on failure — caller wraps the screenshot.
  return { note: 'replace this function' };
}
// <<<

(async () => {
  const cfg = JSON.parse(process.env.PW_DRIVE_CONFIG || '{}');
  if (!cfg.service) { console.log(JSON.stringify({ ok: false, error: 'missing service in PW_DRIVE_CONFIG' })); process.exit(1); }

  const profileDir = path.join(PROFILES_BASE, cfg.service);
  const isBootstrap = !!cfg.bootstrap;
  const headed = isBootstrap || !!cfg.headed;

  fs.mkdirSync(profileDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(OUT_BASE, ts);
  fs.mkdirSync(outDir, { recursive: true });

  const result = { ok: true, service: cfg.service, profile_dir: profileDir, screenshots_on_failure: [] };

  const ctx = await chromium.launchPersistentContext(profileDir, {
    headless: !headed,
    viewport: { width: 1280, height: 900 }
  });

  try {
    const page = ctx.pages()[0] || await ctx.newPage();

    if (isBootstrap) {
      const url = cfg.login_url || cfg.action_url;
      if (!url) throw new Error('bootstrap requires login_url or action_url');
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      console.error(`[bootstrap] Browser open at ${url}. Log in manually. Waiting for selector: ${cfg.login_complete_selector || '(none — close window when done)'}`);
      if (cfg.login_complete_selector) {
        await page.waitForSelector(cfg.login_complete_selector, { timeout: 10 * 60 * 1000 });
        result.bootstrap = 'logged_in';
      } else {
        await page.waitForEvent('close', { timeout: 10 * 60 * 1000 });
        result.bootstrap = 'window_closed';
      }
    } else {
      if (cfg.action_url) await page.goto(cfg.action_url, { waitUntil: 'domcontentloaded' });
      result.result = await action(page, cfg.action_args || {});
    }
  } catch (e) {
    result.ok = false;
    result.error = e.message;
    try {
      const errShot = path.join(outDir, 'error.png');
      const p = ctx.pages()[0];
      if (p) await p.screenshot({ path: errShot, fullPage: true });
      result.screenshots_on_failure.push(errShot);
    } catch (_) {}
  } finally {
    await ctx.close();
  }

  console.log(JSON.stringify(result));
})();
