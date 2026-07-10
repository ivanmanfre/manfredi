#!/usr/bin/env node
// Bump one plugin's version everywhere it lives, and prepend its CHANGELOG.
// Usage: node scripts/bump-version.mjs <plugin> <patch|minor|major> "<changelog entry>"
// Writes: plugins/<p>/.claude-plugin/plugin.json, .claude-plugin/marketplace.json,
//         VERSION_MAP.json, plugins/<p>/CHANGELOG.md
// The n8n publish node builds the same payload server-side; this script is the
// reference implementation and the local/manual path.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";

const [plugin, level, entry] = process.argv.slice(2);
if (!plugin || !["patch", "minor", "major"].includes(level) || !entry) {
  console.error('usage: bump-version.mjs <plugin> <patch|minor|major> "<changelog entry>"');
  process.exit(1);
}
const root = join(dirname(new URL(import.meta.url).pathname), "..");
const pjPath = join(root, "plugins", plugin, ".claude-plugin/plugin.json");
const pj = JSON.parse(readFileSync(pjPath, "utf8"));
const [ma, mi, pa] = pj.version.split(".").map(Number);
const next = level === "major" ? `${ma + 1}.0.0` : level === "minor" ? `${ma}.${mi + 1}.0` : `${ma}.${mi}.${pa + 1}`;

pj.version = next;
writeFileSync(pjPath, JSON.stringify(pj, null, 2) + "\n");

const mpPath = join(root, ".claude-plugin/marketplace.json");
const mp = JSON.parse(readFileSync(mpPath, "utf8"));
const row = mp.plugins.find((p) => p.name === plugin);
if (!row) { console.error(`plugin ${plugin} not in marketplace.json`); process.exit(1); }
row.version = next;
writeFileSync(mpPath, JSON.stringify(mp, null, 2) + "\n");

const vmPath = join(root, "VERSION_MAP.json");
const vm = JSON.parse(readFileSync(vmPath, "utf8"));
vm[plugin] = { ...(vm[plugin] || {}), version: next, last_bump: new Date().toISOString().slice(0, 10) };
writeFileSync(vmPath, JSON.stringify(vm, null, 2) + "\n");

const clPath = join(root, "plugins", plugin, "CHANGELOG.md");
const cl = readFileSync(clPath, "utf8");
const lines = cl.split("\n");
const insertAt = lines.findIndex((l) => l.startsWith("## ")); // before latest entry
const block = [`## ${next} — ${new Date().toISOString().slice(0, 10)}`, entry, ""];
lines.splice(insertAt === -1 ? lines.length : insertAt, 0, ...block);
writeFileSync(clPath, lines.join("\n"));

console.log(`${plugin}: ${[ma, mi, pa].join(".")} -> ${next} (${level})`);
console.log(`tag with: git tag ${plugin}-v${next}`);
