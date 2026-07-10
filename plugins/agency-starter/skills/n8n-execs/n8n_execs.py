#!/usr/bin/env python3
"""
n8n_execs.py — query your n8n executions/workflows via the REST API. MCP-free.

Reads your n8n host + API key from environment variables (or a .env file at the
repo root) and hits the n8n public REST API directly. Read-only: it inspects
runtime state, it never edits or triggers workflows.

Setup (once):
  1. Copy .env.example to .env at the repo root.
  2. Fill in N8N_API_URL and N8N_API_KEY.
     - URL is your instance base, e.g. https://yourname.app.n8n.cloud  (no /api/v1)
     - Key: n8n → Settings → n8n API → Create an API key.

Usage:
  n8n_execs.py recent [--days N] [--status error|success|running|...]
  n8n_execs.py exec <id> [--include-data]
  n8n_execs.py errors [--days N] [--limit N]
  n8n_execs.py wf <workflow_id> [--limit N]
  n8n_execs.py active                # currently-running executions
  n8n_execs.py health                # workflow + execution summary
  n8n_execs.py search <query>        # find workflows by name
  n8n_execs.py wf-info <workflow_id> # workflow metadata + trigger nodes
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime
from pathlib import Path


def load_dotenv() -> None:
    """Load KEY=VALUE pairs from the nearest .env file (walking up from cwd),
    without overwriting variables already set in the environment."""
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


def resolve_creds() -> tuple[str, str]:
    """Return (host_base_url, api_key) from N8N_API_URL / N8N_API_KEY."""
    load_dotenv()
    host = (os.environ.get("N8N_API_URL") or "").rstrip("/")
    key = os.environ.get("N8N_API_KEY") or ""
    if not host or not key:
        raise RuntimeError(
            "Missing n8n credentials. Set N8N_API_URL and N8N_API_KEY in your "
            "environment or in a .env file at the repo root (see .env.example)."
        )
    # Tolerate someone pasting the full /api/v1 URL.
    if host.endswith("/api/v1"):
        host = host[: -len("/api/v1")]
    return host, key


def http_get(url: str, key: str, timeout: int = 15) -> dict:
    req = urllib.request.Request(url, headers={"X-N8N-API-KEY": key})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="ignore")[:200]
        hint = ""
        if e.code in (401, 403):
            hint = " — check N8N_API_KEY (is it valid / not expired?)"
        elif e.code == 404:
            hint = " — check N8N_API_URL (base instance URL, no /api/v1)"
        raise RuntimeError(f"n8n HTTP {e.code}: {body}{hint}")
    except urllib.error.URLError as e:
        raise RuntimeError(f"Could not reach n8n at {url}: {e.reason}")


def workflow_name_map(host: str, key: str) -> dict:
    data = http_get(f"{host}/api/v1/workflows?limit=250", key)
    return {w["id"]: w.get("name", w["id"]) for w in data.get("data", [])}


def fmt_dur(started: str, stopped: str | None) -> float | None:
    try:
        t0 = datetime.fromisoformat(started.replace("Z", "+00:00"))
        if not stopped:
            return None
        t1 = datetime.fromisoformat(stopped.replace("Z", "+00:00"))
        return round((t1 - t0).total_seconds(), 2)
    except (ValueError, TypeError, AttributeError):
        return None


def cmd_recent(host, key, args):
    params = {"limit": args.limit, "includeData": "false"}
    if args.status:
        params["status"] = args.status
    url = f"{host}/api/v1/executions?" + urllib.parse.urlencode(params)
    data = http_get(url, key).get("data", [])
    names = workflow_name_map(host, key)
    cutoff = time.time() - args.days * 86400
    out = []
    for e in data:
        try:
            t = datetime.fromisoformat((e.get("startedAt") or "").replace("Z", "+00:00")).timestamp()
        except (ValueError, AttributeError):
            t = 0
        if t < cutoff:
            continue
        out.append({
            "id": e.get("id"),
            "started": e.get("startedAt"),
            "status": e.get("status"),
            "duration_s": fmt_dur(e.get("startedAt") or "", e.get("stoppedAt")),
            "workflow": names.get(e.get("workflowId"), e.get("workflowId")),
            "wf_id": e.get("workflowId"),
        })
    return out


def cmd_exec(host, key, args):
    inc = "true" if args.include_data else "false"
    return http_get(f"{host}/api/v1/executions/{args.id}?includeData={inc}", key)


def cmd_errors(host, key, args):
    params = {"limit": args.limit, "status": "error", "includeData": "false"}
    data = http_get(f"{host}/api/v1/executions?" + urllib.parse.urlencode(params), key).get("data", [])
    names = workflow_name_map(host, key)
    cutoff = time.time() - args.days * 86400
    out = []
    for e in data:
        try:
            t = datetime.fromisoformat((e.get("startedAt") or "").replace("Z", "+00:00")).timestamp()
        except (ValueError, AttributeError):
            continue
        if t < cutoff:
            continue
        out.append({
            "id": e.get("id"),
            "started": e.get("startedAt"),
            "workflow": names.get(e.get("workflowId"), e.get("workflowId")),
            "wf_id": e.get("workflowId"),
            "duration_s": fmt_dur(e.get("startedAt") or "", e.get("stoppedAt")),
        })
    return out


def cmd_wf(host, key, args):
    params = {"limit": args.limit, "workflowId": args.workflow_id, "includeData": "false"}
    data = http_get(f"{host}/api/v1/executions?" + urllib.parse.urlencode(params), key).get("data", [])
    return [
        {
            "id": e.get("id"),
            "started": e.get("startedAt"),
            "status": e.get("status"),
            "duration_s": fmt_dur(e.get("startedAt") or "", e.get("stoppedAt")),
        }
        for e in data
    ]


def cmd_active(host, key, args):
    params = {"limit": "100", "status": "running", "includeData": "false"}
    data = http_get(f"{host}/api/v1/executions?" + urllib.parse.urlencode(params), key).get("data", [])
    names = workflow_name_map(host, key)
    return [
        {"id": e.get("id"), "started": e.get("startedAt"), "workflow": names.get(e.get("workflowId"), e.get("workflowId"))}
        for e in data
    ]


def cmd_health(host, key, args):
    wfs = http_get(f"{host}/api/v1/workflows?limit=250", key).get("data", [])
    active = [w for w in wfs if w.get("active")]
    execs = http_get(f"{host}/api/v1/executions?limit=250&includeData=false", key).get("data", [])
    by_status = Counter((e.get("status") or "?").lower() for e in execs)
    return {
        "workflows_total": len(wfs),
        "workflows_active": len(active),
        "last_250_executions": dict(by_status),
        "first_exec_at": execs[-1].get("startedAt") if execs else None,
        "latest_exec_at": execs[0].get("startedAt") if execs else None,
    }


def cmd_search(host, key, args):
    wfs = http_get(f"{host}/api/v1/workflows?limit=250", key).get("data", [])
    q = args.query.lower()
    matched = [w for w in wfs if q in (w.get("name") or "").lower()]
    return [
        {"id": w["id"], "name": w["name"], "active": w.get("active"), "updatedAt": w.get("updatedAt")}
        for w in matched[:50]
    ]


def cmd_wf_info(host, key, args):
    wf = http_get(f"{host}/api/v1/workflows/{args.workflow_id}", key)
    triggers = []
    for n in wf.get("nodes", []):
        t = n.get("type", "")
        if "trigger" in t.lower() or "webhook" in t.lower() or "schedule" in t.lower():
            triggers.append({"name": n.get("name"), "type": t})
    return {
        "id": wf.get("id"),
        "name": wf.get("name"),
        "active": wf.get("active"),
        "node_count": len(wf.get("nodes", [])),
        "triggers": triggers,
        "updatedAt": wf.get("updatedAt"),
        "createdAt": wf.get("createdAt"),
    }


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("recent")
    p.add_argument("--days", type=int, default=7)
    p.add_argument("--status")
    p.add_argument("--limit", type=int, default=100)

    p = sub.add_parser("exec")
    p.add_argument("id")
    p.add_argument("--include-data", action="store_true")

    p = sub.add_parser("errors")
    p.add_argument("--days", type=int, default=7)
    p.add_argument("--limit", type=int, default=50)

    p = sub.add_parser("wf")
    p.add_argument("workflow_id")
    p.add_argument("--limit", type=int, default=50)

    sub.add_parser("active")
    sub.add_parser("health")

    p = sub.add_parser("search")
    p.add_argument("query")

    p = sub.add_parser("wf-info")
    p.add_argument("workflow_id")

    args = parser.parse_args()

    host, key = resolve_creds()

    handler = {
        "recent": cmd_recent, "exec": cmd_exec, "errors": cmd_errors,
        "wf": cmd_wf, "active": cmd_active, "health": cmd_health,
        "search": cmd_search, "wf-info": cmd_wf_info,
    }[args.cmd]
    out = handler(host, key, args)

    print(json.dumps({"host": host, "result": out}, indent=2, default=str))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        sys.stderr.write(f"ERROR: {e}\n")
        sys.exit(1)
