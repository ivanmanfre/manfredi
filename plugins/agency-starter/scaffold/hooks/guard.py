#!/usr/bin/env python3
"""
guard.py — a beginner seatbelt for Claude Code.

Runs before every Bash command Claude wants to execute (wired in
.claude/settings.json as a PreToolUse hook). If the command looks destructive
or irreversible, it BLOCKS it and explains why, instead of letting it run.

This is intentionally conservative. It is here so a new user can't accidentally
nuke files, force-push over history, or pipe a script from the internet straight
into a shell. If you ever genuinely need a blocked command, run it yourself in
your own Terminal where you can see exactly what it does.

How blocking works: exit code 2 + a message on stderr tells Claude Code to stop
and show the reason. Exit code 0 = allowed.
"""
import json
import re
import sys

# (pattern, plain-English reason) — matched against the full command string.
DANGER = [
    (r"\brm\s+(-[a-z]*r[a-z]*\s+)?(-[a-z]*f[a-z]*\s+)?(/|~|\$HOME|\*)",
     "This deletes files recursively/forcefully — easy to wipe the wrong thing."),
    (r"\brm\s+-[a-z]*f", "Force-deleting files skips the safety net. Delete specific files by name instead."),
    (r"\bgit\s+push\b.*(--force|-f)\b", "Force-pushing can erase history on the remote. Push normally."),
    (r"\bgit\s+reset\s+--hard", "git reset --hard throws away uncommitted work permanently."),
    (r"\bgit\s+clean\s+-[a-z]*f", "git clean -f permanently deletes untracked files."),
    (r"\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(bash|sh|zsh)\b",
     "Piping a downloaded script straight into a shell runs unknown code. Download it, read it, then run it."),
    (r"\bsudo\b", "Commands with sudo change your whole machine. Run these yourself, deliberately, in Terminal."),
    (r"\bchmod\s+-R\s+777", "chmod -R 777 makes files world-writable — a security hole."),
    (r">\s*/dev/(sd|disk|null/)", "Writing to a raw device can destroy a disk."),
    (r"\b(mkfs|dd)\b", "mkfs/dd can overwrite entire disks."),
    (r"\b(shutdown|reboot|halt)\b", "This would power off / restart the machine."),
    (r"\bkillall\b", "killall can take down processes you didn't mean to."),
    (r":\(\)\s*\{\s*:\|:&\s*\}", "That's a fork bomb — it would freeze the machine."),
]


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)  # can't parse — don't get in the way

    if payload.get("tool_name") != "Bash":
        sys.exit(0)

    command = (payload.get("tool_input") or {}).get("command", "") or ""

    for pattern, reason in DANGER:
        if re.search(pattern, command, re.IGNORECASE):
            sys.stderr.write(
                "🛑 Blocked by the safety guard.\n\n"
                f"Command: {command}\n\n"
                f"Why: {reason}\n\n"
                "If you truly need this, run it yourself in Terminal where you can see what it does. "
                "Or ask Claude to do it a safer way.\n"
            )
            sys.exit(2)  # exit 2 = block and show Claude the reason

    sys.exit(0)


if __name__ == "__main__":
    main()
