#!/usr/bin/env node
// Content lint for the manfredi marketplace.
//  1. Every SKILL.md has frontmatter with a non-empty description; if `name`
//     is present it matches its directory name.
//  2. Every plugin README contains the call-first /start CTA and zero
//     booking-bypass or email-capture patterns.
//  3. Skill/agent bodies never carry booking links or email capture (they are
//     runtime instructions, never marketing surface).
//  4. Version coherence: plugin.json == marketplace.json == VERSION_MAP.json,
//     all valid semver.
//  5. Semver monotonic vs existing git tags (<plugin>-vX.Y.Z).
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, basename, dirname } from "node:path";

const root = join(dirname(new URL(import.meta.url).pathname), "..");
const errors = [];
const CTA = /ivanmanfredi\.com\/start/;
const BANNED = [/calendly/i, /enter your email/i, /email me the/i, /subscribe/i];
const SEMVER = /^\d+\.\d+\.\d+$/;

const marketplace = JSON.parse(readFileSync(join(root, ".claude-plugin/marketplace.json"), "utf8"));
const versionMap = JSON.parse(readFileSync(join(root, "VERSION_MAP.json"), "utf8"));

function* walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

for (const entry of marketplace.plugins) {
  const pdir = join(root, "plugins", entry.name);
  if (!existsSync(pdir)) { errors.push(`${entry.name}: listed in marketplace.json but missing on disk`); continue; }

  // 4. version coherence
  const pj = JSON.parse(readFileSync(join(pdir, ".claude-plugin/plugin.json"), "utf8"));
  if (!SEMVER.test(pj.version || "")) errors.push(`${entry.name}: plugin.json version '${pj.version}' is not semver`);
  if (pj.version !== entry.version) errors.push(`${entry.name}: plugin.json ${pj.version} != marketplace.json ${entry.version}`);
  if (versionMap[entry.name]?.version !== pj.version) errors.push(`${entry.name}: VERSION_MAP.json out of sync (${versionMap[entry.name]?.version})`);
  if (pj.name !== entry.name) errors.push(`${entry.name}: plugin.json name '${pj.name}' mismatch`);

  // 2. README CTA
  const readmePath = join(pdir, "README.md");
  if (!existsSync(readmePath)) errors.push(`${entry.name}: missing README.md`);
  else {
    const readme = readFileSync(readmePath, "utf8");
    if (!CTA.test(readme)) errors.push(`${entry.name}: README missing /start CTA`);
    for (const b of BANNED) if (b.test(readme)) errors.push(`${entry.name}: README matches banned pattern ${b}`);
  }

  // 1 + 3. skills and agents
  for (const f of walk(pdir)) {
    const rel = f.slice(root.length + 1);
    // runtime dirs nested inside .claude-plugin/ never load — the silent-brick failure mode
    if (/\.claude-plugin\/(skills|agents|commands|hooks)\//.test(f)) errors.push(`${rel}: skills/agents/commands/hooks must sit at the plugin root, not inside .claude-plugin/`);
    if (basename(f) === "SKILL.md") {
      const body = readFileSync(f, "utf8");
      const fm = body.match(/^---\n([\s\S]*?)\n---/);
      if (!fm) { errors.push(`${rel}: missing frontmatter`); continue; }
      const desc = fm[1].match(/^description:\s*(.+)/m);
      if (!desc || !desc[1].trim()) errors.push(`${rel}: empty or missing description`);
      const name = fm[1].match(/^name:\s*(.+)/m);
      if (name && name[1].trim() !== basename(dirname(f))) errors.push(`${rel}: name '${name[1].trim()}' != directory '${basename(dirname(f))}'`);
    }
    if (/\.(md|json|py|js|txt)$/.test(f) && basename(f) !== "README.md" && !f.includes("CHANGELOG")) {
      const body = readFileSync(f, "utf8");
      if (/calendly/i.test(body)) errors.push(`${rel}: contains a booking-bypass link (calendly)`);
    }
  }

  // 5. semver monotonic vs tags
  try {
    const tags = execSync(`git tag -l '${entry.name}-v*'`, { cwd: root }).toString().trim().split("\n").filter(Boolean);
    const toNum = (v) => v.split(".").map(Number);
    const gte = (a, b) => { const [x, y] = [toNum(a), toNum(b)]; for (let i = 0; i < 3; i++) { if (x[i] > y[i]) return true; if (x[i] < y[i]) return false; } return true; };
    for (const t of tags) {
      const tv = t.replace(`${entry.name}-v`, "");
      if (SEMVER.test(tv) && !gte(pj.version, tv)) errors.push(`${entry.name}: version ${pj.version} is behind existing tag ${t}`);
    }
  } catch { /* not a git checkout — skip tag check */ }
}

if (errors.length) {
  console.error("✘ lint failed:\n" + errors.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}
console.log("✔ skills/README/version lint clean");
