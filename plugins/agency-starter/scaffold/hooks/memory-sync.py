#!/usr/bin/env python3
"""
memory-sync.py — push local memory/ files up to the Supabase claude_memory table.

Idempotent: compares a content hash and only sends what changed (insert / update /
delete). Reads SUPABASE_URL + SUPABASE_KEY from the environment or .env. If they
aren't set, it does nothing (local memory still works without the cloud).

Tiers → client_id namespace:
  memory/global/   → 'global'
  memory/shared/   → 'shared-tech'
  memory/project/  → PROJECT_ID from .env (default 'project')

Run manually:   python3 .claude/hooks/memory-sync.py --force
As a hook:      wired in .claude/settings.json (Stop) so it syncs after each session.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

TABLE = "claude_memory"
TIER_CLIENT = {"global": "global", "shared": "shared-tech"}  # 'project' resolved below


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
    here = Path.cwd()
    for d in [here, *here.parents]:
        cand = d / "memory"
        if (cand / "global").exists() or (cand / "project").exists():
            return cand
    return None


def hash_content(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def request(method, url, key, body=None):
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=12) as r:
        raw = r.read().decode()
        return json.loads(raw) if raw else None


def sync_tier(url, key, directory: Path, client_id: str, tier: str):
    if not directory.exists():
        return None
    locals_map = {}
    for path in sorted(directory.glob("*.md")):
        if path.name == "MEMORY.md" or path.name.startswith("_"):
            continue
        try:
            text = path.read_text()
        except OSError:
            continue
        locals_map[path.name] = (text, hash_content(text))

    qenc = urllib.parse.quote(client_id)
    existing = request("GET", f"{url}/rest/v1/{TABLE}?select=id,file_path,content,content_hash&client_id=eq.{qenc}", key) or []
    remote = {}
    for row in existing:
        name = (row.get("file_path") or "").split("/")[-1]
        if name:
            remote[name] = (row["id"], row.get("content_hash") or hash_content(row.get("content") or ""))

    inserts, updates, deletes = [], [], []
    for name, (text, h) in locals_map.items():
        fp = f"{tier}/{name}"
        if name not in remote:
            inserts.append({"client_id": client_id, "file_path": fp, "content": text, "content_hash": h})
        elif remote[name][1] != h:
            updates.append((remote[name][0], {"content": text, "content_hash": h,
                                              "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}))
    for name, (rid, _h) in remote.items():
        if name not in locals_map:
            deletes.append(rid)

    if inserts:
        request("POST", f"{url}/rest/v1/{TABLE}", key, body=inserts)
    for rid, patch in updates:
        request("PATCH", f"{url}/rest/v1/{TABLE}?id=eq.{rid}", key, body=patch)
    for rid in deletes:
        request("DELETE", f"{url}/rest/v1/{TABLE}?id=eq.{rid}", key)
    return (len(inserts), len(updates), len(deletes), len(locals_map))


def main():
    load_dotenv()
    url = (os.environ.get("SUPABASE_URL") or "").rstrip("/")
    key = os.environ.get("SUPABASE_KEY") or ""
    if not url or not key:
        # Cloud not configured — silently fine.
        return 0

    root = find_memory_root()
    if not root:
        return 0

    project_id = os.environ.get("PROJECT_ID") or "project"
    tiers = dict(TIER_CLIENT)
    tiers["project"] = project_id

    summary = []
    for tier, client_id in tiers.items():
        try:
            r = sync_tier(url, key, root / tier, client_id, tier)
            if r is not None:
                summary.append(f"{tier} +{r[0]} ~{r[1]} -{r[2]} ({r[3]})")
        except Exception as e:
            summary.append(f"{tier} ERROR: {str(e)[:80]}")

    if summary:
        print("memory-sync: " + " | ".join(summary))
    return 0


if __name__ == "__main__":
    sys.exit(main())
