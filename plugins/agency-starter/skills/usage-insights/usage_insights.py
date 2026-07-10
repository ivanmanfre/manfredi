#!/usr/bin/env python3
"""
usage_insights.py — a friendly look at how you've been using Claude Code.

Reads your local Claude Code session transcripts (~/.claude/projects/**/*.jsonl)
and prints a plain summary: how many sessions, which tools you lean on, which
skills you've actually used, and how recently. Nothing leaves your machine.

Usage:
  usage_insights.py [--days N]     # default: last 30 days
"""
from __future__ import annotations

import argparse
import json
import os
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

PROJECTS = Path(os.path.expanduser("~/.claude/projects"))


def parse_ts(obj: dict) -> float | None:
    ts = obj.get("timestamp")
    if not ts:
        return None
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp()
    except (ValueError, AttributeError):
        return None


def iter_tool_uses(message: dict):
    """Yield (tool_name, input_dict) for each tool_use in an assistant message."""
    content = message.get("content")
    if not isinstance(content, list):
        return
    for block in content:
        if isinstance(block, dict) and block.get("type") == "tool_use":
            yield block.get("name", "?"), (block.get("input") or {})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=30)
    args = ap.parse_args()

    if not PROJECTS.exists():
        print("No Claude Code history found yet (~/.claude/projects is empty).")
        print("Use Claude Code for a bit, then run this again.")
        return

    cutoff = datetime.now(timezone.utc).timestamp() - args.days * 86400
    files = list(PROJECTS.glob("**/*.jsonl"))

    sessions = 0
    user_msgs = 0
    tools = Counter()
    skills = Counter()
    last_active = 0.0

    for f in files:
        touched = False
        try:
            lines = f.read_text(errors="ignore").splitlines()
        except OSError:
            continue
        for line in lines:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                continue
            t = parse_ts(obj)
            if t is not None:
                if t < cutoff:
                    continue
                touched = True
                last_active = max(last_active, t)
            typ = obj.get("type")
            msg = obj.get("message") or {}
            if typ == "user":
                user_msgs += 1
            elif typ == "assistant":
                for name, inp in iter_tool_uses(msg):
                    tools[name] += 1
                    if name == "Skill":
                        skills[inp.get("skill") or inp.get("command") or "?"] += 1
        if touched:
            sessions += 1

    print(f"=== Claude Code usage — last {args.days} days ===\n")
    if sessions == 0:
        print("No activity in this window. Try a wider --days value.")
        return

    when = datetime.fromtimestamp(last_active, timezone.utc).strftime("%Y-%m-%d") if last_active else "?"
    print(f"Sessions:        {sessions}")
    print(f"Your messages:   {user_msgs}")
    print(f"Last active:     {when}\n")

    print("Tools you use most:")
    for name, n in tools.most_common(10):
        print(f"  {n:>5}  {name}")
    if not tools:
        print("  (none yet)")

    print("\nSkills you've actually used:")
    if skills:
        for name, n in skills.most_common(15):
            print(f"  {n:>5}  {name}")
    else:
        print("  (none yet — try: 'use the claude-code-tutorial skill')")

    print("\nTip: skills you've never used are worth a look — ask Claude what each one does.")


if __name__ == "__main__":
    main()
