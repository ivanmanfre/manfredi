#!/usr/bin/env python3
"""UserPromptSubmit hook: nudge to /clear or /compact when the live session's
context has grown large enough to hurt — first on QUALITY (the "dumb zone"
where models start missing things), then on COST (heavy, then expensive).

How it estimates budget:
- The signal is objective: the current effective context size, taken from the
  most recent assistant turn's usage — input_tokens + cache_read_input_tokens +
  cache_creation_input_tokens. Every turn re-reads that whole window, so a big
  session taxes every prompt.
- Two distinct concerns: the lower band warns about accuracy degradation (the
  "dumb zone"); the higher bands warn about per-turn cost. Different problems,
  different advice.
- Cheap: tail-reads only the end of the transcript, never the whole file.
- No nag: throttled to fire once per bucket per session (state file),
  escalation only — at most ~3 nudges across a session's entire life.
- Cost is expressed as a multiplier vs a fresh session, not a % of any cap.

Fail-safe: every path is wrapped so that on ANY error or uncertainty the hook
exits 0 and emits nothing. A hook must never crash or block a session.

Tunables (all optional env vars; sane defaults below):
  CTX_GUARD_QUALITY        quality "dumb zone" onset, tokens   (default 250000)
  CTX_GUARD_SOFT           "getting heavy" cost band, tokens   (default 500000)
  CTX_GUARD_LOUD           "expensive" cost band, tokens       (default 800000)
  CTX_GUARD_FRESH_BASELINE fresh-session size for multiplier   (default 30000)
  CTX_GUARD_DISABLE        set to any non-empty value to disable entirely
"""
import json
import os
import sys
from pathlib import Path


def _int_env(name, default):
    try:
        v = os.environ.get(name)
        if v is None or v.strip() == "":
            return default
        return max(1, int(v))
    except Exception:
        return default


# Scan back this far for the last assistant turn. Sessions can have a tail of
# tiny sync/summary records, or huge individual records, so a small window can
# miss the real turn — grow the window until found, capped to stay cheap.
TAIL_STEPS = [256 * 1024, 1024 * 1024, 4 * 1024 * 1024]


def emit(text):
    out = {"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": text}}
    sys.stdout.write(json.dumps(out))


def _scan_tail(transcript_path, nbytes):
    try:
        size = os.path.getsize(transcript_path)
        with open(transcript_path, "rb") as f:
            if size > nbytes:
                f.seek(-nbytes, os.SEEK_END)
                f.readline()  # discard partial first line
            lines = f.read().decode("utf-8", "ignore").splitlines()
    except Exception:
        return 0
    for line in reversed(lines):
        try:
            o = json.loads(line)
        except Exception:
            continue
        if not isinstance(o, dict):
            continue
        msg = o.get("message")
        if not isinstance(msg, dict) or msg.get("role") != "assistant":
            continue
        u = msg.get("usage") or {}
        if not isinstance(u, dict):
            continue
        try:
            ctx = (u.get("input_tokens", 0) or 0) \
                + (u.get("cache_read_input_tokens", 0) or 0) \
                + (u.get("cache_creation_input_tokens", 0) or 0)
        except Exception:
            continue
        if ctx > 0:
            return ctx
    return 0


def effective_context(transcript_path):
    """Most recent assistant turn's effective context size, or 0. Grows the
    scan window until a real assistant turn is found (handles trailing sync
    records and oversized records)."""
    for nbytes in TAIL_STEPS:
        try:
            ctx = _scan_tail(transcript_path, nbytes)
        except Exception:
            ctx = 0
        if ctx > 0:
            return ctx
    return 0


def run():
    if os.environ.get("CTX_GUARD_DISABLE"):
        return

    QUALITY = _int_env("CTX_GUARD_QUALITY", 250_000)
    SOFT = _int_env("CTX_GUARD_SOFT", 500_000)
    LOUD = _int_env("CTX_GUARD_LOUD", 800_000)
    FRESH_BASELINE = _int_env("CTX_GUARD_FRESH_BASELINE", 30_000)
    state_dir = Path.home() / ".claude" / ".ctx-guard-state"

    try:
        hook_input = json.loads(sys.stdin.read())
    except Exception:
        return
    if not isinstance(hook_input, dict):
        return

    prompt = (hook_input.get("prompt") or "")
    if isinstance(prompt, str) and "--noguard" in prompt:   # explicit escape hatch
        return
    session_id = hook_input.get("session_id") or "unknown"
    transcript = hook_input.get("transcript_path")
    if not transcript:
        return

    ctx = effective_context(transcript)
    # 0 = fine; 1 = dumb-zone (quality); 2 = heavy (cost); 3 = expensive (cost, loud)
    if ctx >= LOUD:
        bucket = 3
    elif ctx >= SOFT:
        bucket = 2
    elif ctx >= QUALITY:
        bucket = 1
    else:
        bucket = 0
    if bucket == 0:
        return  # the ~99% case: read the number, stay silent, no tokens injected

    # Throttle: only speak when entering a higher bucket than already warned.
    try:
        state_dir.mkdir(parents=True, exist_ok=True)
        state_file = state_dir / f"{session_id}.json"
    except Exception:
        state_file = None
    last = 0
    if state_file is not None:
        try:
            last = json.loads(state_file.read_text()).get("bucket", 0)
        except Exception:
            last = 0
    if bucket <= last:
        return
    if state_file is not None:
        try:
            state_file.write_text(json.dumps({"bucket": bucket}))
        except Exception:
            pass

    mult = max(1, round(ctx / FRESH_BASELINE))
    k = round(ctx / 1000)
    qk = round(QUALITY / 1000)
    if bucket == 3:
        note = (
            f"[context-budget-guard] This session is at ~{k}K tokens of context. "
            f"Every turn re-reads all of it — roughly {mult}x the per-turn cost of a fresh session. "
            f"Strongly recommend /clear (or /compact if you need the history) before continuing, "
            f"especially for any loop/iterate/test-until-it-works work. "
            f"Surface this to the user plainly."
        )
    elif bucket == 2:
        note = (
            f"[context-budget-guard] Heads up: this session is at ~{k}K tokens (~{mult}x a fresh "
            f"session per turn). Consider /compact or /clear soon if continuing with heavy work. "
            f"Mention this briefly to the user."
        )
    else:  # bucket == 1: quality, not cost
        note = (
            f"[context-budget-guard] Quality check: this session is at ~{k}K tokens — past the "
            f"~{qk}K point where large-context models tend to enter a 'dumb zone' and start missing "
            f"things a fresh context wouldn't. This is about accuracy, not cost. For anything precise "
            f"or iterate-heavy (multi-step edits, audits, renders), prefer /clear (or /compact to keep "
            f"history) before continuing. Mention this briefly to the user."
        )
    emit(note)


def main():
    try:
        run()
    except Exception:
        # Absolute backstop: never crash, never block, emit nothing.
        return


if __name__ == "__main__":
    main()
