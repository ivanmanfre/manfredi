#!/usr/bin/env python3
"""
recall.py — search your memory across all tiers (and the cloud, if configured).

Searches the local memory/ folders (global, shared, project). If SUPABASE_URL and
SUPABASE_KEY are set (in the environment or .env), it also runs a keyword search
against the cloud mirror via the search_memories() function.

Usage:  python3 recall.py "<query>"
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.request
from pathlib import Path

MAX_PER_TIER = 6
MAX_CLOUD = 6
TIERS = ["global", "shared", "project"]


def load_dotenv() -> None:
    here = Path.cwd()
    for d in [here, *here.parents]:
        env = d / ".env"
        if env.exists():
            for line in env.read_text(errors="ignore").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                k, v = k.strip(), v.strip().strip('"').strip("'")
                if k and k not in os.environ:
                    os.environ[k] = v
            return


def find_memory_root() -> Path | None:
    """Walk up from cwd to find a 'memory' folder that has tier subdirs."""
    here = Path.cwd()
    for d in [here, *here.parents]:
        cand = d / "memory"
        if (cand / "global").exists() or (cand / "project").exists():
            return cand
    return None


def search_dir(directory: Path, query: str, label: str):
    if not directory.exists():
        return []
    q = query.lower()
    q_words = [w for w in re.findall(r"\w+", q) if len(w) >= 2]
    results = []
    for path in sorted(directory.rglob("*.md")):
        if path.name.startswith("_"):
            continue
        try:
            text = path.read_text(errors="ignore")
        except OSError:
            continue
        name_score = 5 if q in path.stem.lower() else (2 if any(w in path.stem.lower() for w in q_words) else 0)
        for i, line in enumerate(text.splitlines(), 1):
            ll = line.lower()
            if q in ll:
                results.append((10 + name_score, label, path.name, i, line.strip()))
            elif q_words and all(w in ll for w in q_words):
                results.append((6 + name_score, label, path.name, i, line.strip()))
            elif q_words and any(w in ll for w in q_words):
                results.append((2 + name_score, label, path.name, i, line.strip()))
    seen, unique = set(), []
    for r in sorted(results, key=lambda x: -x[0]):
        sig = (r[1], r[2], r[4][:80])
        if sig in seen:
            continue
        seen.add(sig)
        unique.append(r)
    return unique[:MAX_PER_TIER]


def search_cloud(query: str):
    """Keyword search via the search_memories() RPC. Silent no-op if not configured."""
    url = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    key = os.environ.get("SUPABASE_KEY") or ""
    if not url or not key:
        return []
    body = json.dumps({"query_text": query, "match_count": MAX_CLOUD}).encode()
    req = urllib.request.Request(
        f"{url}/rest/v1/rpc/search_memories",
        data=body,
        headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            rows = json.loads(r.read().decode())
    except Exception:
        return []
    out = []
    for row in rows if isinstance(rows, list) else []:
        content = (row.get("content") or "").strip()
        snippet = ""
        in_fm = False
        for line in content.splitlines():
            s = line.strip()
            if s == "---":
                in_fm = not in_fm
                continue
            if in_fm or not s or s.startswith("#"):
                continue
            snippet = s
            break
        out.append((row.get("client_id", "?"), row.get("file_path", "?"), snippet[:160]))
    return out


def main():
    load_dotenv()
    query = " ".join(a for a in sys.argv[1:] if a).strip()
    if not query:
        print('usage: python3 recall.py "<query>"', file=sys.stderr)
        return 2

    root = find_memory_root()
    tier_hits = {}
    if root:
        for tier in TIERS:
            tier_hits[tier] = search_dir(root / tier, query, tier)

    cloud_hits = search_cloud(query)

    if not (any(tier_hits.values()) or cloud_hits):
        print(f"No matches for: {query}")
        return 0

    for tier in TIERS:
        hits = tier_hits.get(tier) or []
        if hits:
            print(f"## {tier} ({len(hits)})")
            for _s, _l, fn, ln, content in hits:
                print(f"  memory/{tier}/{fn}:{ln} — {content[:140]}")
            print()

    if cloud_hits:
        print(f"## cloud (keyword) ({len(cloud_hits)})")
        for cid, fp, snippet in cloud_hits:
            print(f"  [{cid}] {fp}")
            if snippet:
                print(f"      {snippet}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
