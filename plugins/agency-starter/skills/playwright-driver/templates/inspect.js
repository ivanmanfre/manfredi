#!/usr/bin/env node
// Mode 1: Inspect — multi-viewport screenshots, console errors, network failures, optional DOM probes.
// Invocation: node inspect.js (reads PW_INSPECT_CONFIG env var as JSON)
// Config shape: { url, viewports?: number[], probes?: {[selector]: ('style'|'rect'|'text')[]}, headed?: boolean, waitFor?: string }

const path = require('path');
const fs = require('fs');

// Resolve Playwright from this skill's local install (templates/ -> skill root -> node_modules),
// falling back to a normal require so a globally/locally installed playwright also works.
function loadPlaywright() {
  const skillRoot = path.resolve(__dirname, '..');
  const local = path.join(skillRoot, 'node_modules', 'playwright');
  try { return require(local); } catch (_) {}
  return require('playwright'); // resolves from node_modules on the normal search path
}
const { chromium } = loadPlaywright();

// Per-run output dir. Override with PW_OUT_DIR; defaults to the OS temp dir.
const OUT_BASE = process.env.PW_OUT_DIR || path.join(require('os').tmpdir(), 'pw-out');

(async () => {
  const cfg = JSON.parse(process.env.PW_INSPECT_CONFIG || '{}');
  const url = cfg.url;
  if (!url) { console.log(JSON.stringify({ ok: false, error: 'missing url in PW_INSPECT_CONFIG' })); process.exit(1); }

  const viewports = cfg.viewports || [375, 768, 1440];
  const probes = cfg.probes || {};
  const headed = !!cfg.headed;
  const waitFor = cfg.waitFor;

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = path.join(OUT_BASE, ts);
  fs.mkdirSync(outDir, { recursive: true });

  const result = {
    ok: true, url, out_dir: outDir,
    screenshots: [], console_errors: [], network_failures: [], probes: {}
  };

  const browser = await chromium.launch({ headless: !headed });
  try {
    for (const width of viewports) {
      const ctx = await browser.newContext({ viewport: { width, height: Math.round(width * 1.6) } });
      const page = await ctx.newPage();

      page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
          result.console_errors.push({ viewport: width, type: msg.type(), text: msg.text(), location: msg.location() });
        }
      });
      page.on('pageerror', err => {
        result.console_errors.push({ viewport: width, type: 'pageerror', text: err.message });
      });
      page.on('requestfailed', req => {
        result.network_failures.push({ viewport: width, url: req.url(), failure: req.failure()?.errorText });
      });
      page.on('response', resp => {
        if (resp.status() >= 400) {
          result.network_failures.push({ viewport: width, url: resp.url(), status: resp.status() });
        }
      });

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      if (waitFor) await page.waitForSelector(waitFor, { timeout: 10000 });

      const shotPath = path.join(outDir, `${width}.png`);
      await page.screenshot({ path: shotPath, fullPage: true });
      result.screenshots.push(shotPath);

      // Probes only on the first (smallest) viewport to keep output small
      if (width === viewports[0]) {
        for (const [selector, fields] of Object.entries(probes)) {
          try {
            const probe = await page.$eval(selector, (el, fields) => {
              const out = {};
              if (fields.includes('style')) {
                const cs = window.getComputedStyle(el);
                out.style = { color: cs.color, background: cs.backgroundColor, font: cs.font, display: cs.display };
              }
              if (fields.includes('rect')) {
                const r = el.getBoundingClientRect();
                out.rect = { x: r.x, y: r.y, w: r.width, h: r.height };
              }
              if (fields.includes('text')) out.text = el.textContent?.slice(0, 200);
              return out;
            }, fields);
            result.probes[selector] = probe;
          } catch (e) {
            result.probes[selector] = { error: e.message };
          }
        }
      }

      await ctx.close();
    }
  } catch (e) {
    result.ok = false;
    result.error = e.message;
    try {
      const errShot = path.join(outDir, 'error.png');
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await page.goto(url).catch(() => {});
      await page.screenshot({ path: errShot }).catch(() => {});
      result.error_screenshot = errShot;
    } catch (_) {}
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(result));
})();
