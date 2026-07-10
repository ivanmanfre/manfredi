#!/usr/bin/env python3
"""
clickup_search.py — direct ClickUp REST queries, MCP-free.

Single-user. Reads credentials from the environment:
  CLICKUP_API_TOKEN     (required) — personal API token, e.g. pk_12345_ABC...
  CLICKUP_WORKSPACE_ID  (optional) — team/workspace id, e.g. 90000000
                                     required for: search, recent, spaces,
                                     and `lists` without --space.

A `.env` file in the current directory (or repo root) is auto-loaded if present;
real environment variables take precedence over .env values.

Usage:
  clickup_search.py tasks <list_id> [--status <status>] [--limit N]
  clickup_search.py task <task_id>
  clickup_search.py search <query> [--limit N]
  clickup_search.py lists [--space <space_id>]
  clickup_search.py spaces
  clickup_search.py recent [--days N] [--limit N]   # tasks updated in last N days, workspace-wide
  clickup_search.py comment <task_id> <body>
  clickup_search.py update <task_id> --status <status>

Output: JSON to stdout. Errors → stderr, exit 1.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.parse
import urllib.request
from pathlib import Path

API_BASE = "https://api.clickup.com/api/v2"


def load_dotenv() -> None:
    """Load KEY=VALUE pairs from a .env file (cwd, then parent dirs up to repo
    root) into os.environ without overriding existing real env vars.

    Looks for the nearest .env walking upward; stops at the filesystem root.
    """
    cwd = Path.cwd()
    for d in [cwd, *cwd.parents]:
        env_path = d / ".env"
        if not env_path.exists():
            continue
        try:
            for raw in env_path.read_text(errors="ignore").splitlines():
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, val = line.partition("=")
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = val
        except OSError:
            pass
        break  # only load the nearest .env


def resolve_credentials() -> tuple[str, str | None]:
    """Return (token, workspace_id). Raises if no token is found."""
    token = os.environ.get("CLICKUP_API_TOKEN")
    ws = os.environ.get("CLICKUP_WORKSPACE_ID")
    if not token:
        raise RuntimeError(
            "No ClickUp token found. Set CLICKUP_API_TOKEN in your environment "
            "or in a .env file at your repo root. Get a token from "
            "ClickUp → Settings → Apps → API Token (format: pk_...)."
        )
    return token, ws


def http(method: str, path: str, token: str, params: dict | None = None, body: dict | None = None):
    url = API_BASE + path
    if params:
        url += "?" + urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Authorization": token, "Content-Type": "application/json"}
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            raw = r.read().decode()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode(errors="ignore")
        raise RuntimeError(f"ClickUp HTTP {e.code}: {err_body[:300]}")


def cmd_tasks(token, args):
    params = {"include_closed": "true", "subtasks": "true"}
    if args.status:
        params["statuses[]"] = args.status
    res = http("GET", f"/list/{args.list_id}/task", token, params)
    tasks = res.get("tasks", [])[: args.limit]
    return [
        {
            "id": t["id"],
            "name": t["name"],
            "status": t.get("status", {}).get("status"),
            "url": t.get("url"),
            "due": t.get("due_date"),
            "assignees": [a.get("username") for a in t.get("assignees", [])],
        }
        for t in tasks
    ]


def cmd_task(token, args):
    res = http("GET", f"/task/{args.task_id}", token, {"include_subtasks": "true"})
    return {
        "id": res.get("id"),
        "name": res.get("name"),
        "status": res.get("status", {}).get("status"),
        "url": res.get("url"),
        "description": res.get("description") or res.get("text_content"),
        "list": res.get("list", {}).get("name"),
        "assignees": [a.get("username") for a in res.get("assignees", [])],
        "tags": [t.get("name") for t in res.get("tags", [])],
        "custom_fields": [
            {"name": f.get("name"), "value": f.get("value")}
            for f in res.get("custom_fields", [])
            if f.get("value") is not None
        ],
    }


def cmd_search(token, ws, args):
    if not ws:
        raise RuntimeError("CLICKUP_WORKSPACE_ID not set — required for search.")
    res = http(
        "GET",
        f"/team/{ws}/task",
        token,
        {"include_closed": "true", "page": "0", "subtasks": "true"},
    )
    q = args.query.lower()
    tasks = res.get("tasks", [])
    matched = [
        t
        for t in tasks
        if q in (t.get("name") or "").lower() or q in (t.get("text_content") or "").lower()
    ]
    return [
        {"id": t["id"], "name": t["name"], "status": t.get("status", {}).get("status"), "url": t.get("url")}
        for t in matched[: args.limit]
    ]


def cmd_lists(token, ws, args):
    if args.space:
        res = http("GET", f"/space/{args.space}/list", token)
        return [{"id": l["id"], "name": l["name"]} for l in res.get("lists", [])]
    if not ws:
        raise RuntimeError("CLICKUP_WORKSPACE_ID required (or pass --space).")
    spaces = http("GET", f"/team/{ws}/space", token).get("spaces", [])
    out = []
    for s in spaces:
        lists = http("GET", f"/space/{s['id']}/list", token).get("lists", [])
        for l in lists:
            out.append({"space": s["name"], "id": l["id"], "name": l["name"]})
    return out


def cmd_spaces(token, ws):
    if not ws:
        raise RuntimeError("CLICKUP_WORKSPACE_ID required.")
    res = http("GET", f"/team/{ws}/space", token)
    return [{"id": s["id"], "name": s["name"]} for s in res.get("spaces", [])]


def cmd_recent(token, ws, args):
    if not ws:
        raise RuntimeError("CLICKUP_WORKSPACE_ID required.")
    import time

    since_ms = int((time.time() - args.days * 86400) * 1000)
    res = http(
        "GET",
        f"/team/{ws}/task",
        token,
        {
            "date_updated_gt": str(since_ms),
            "include_closed": "true",
            "subtasks": "true",
            "order_by": "updated",
            "reverse": "true",
        },
    )
    return [
        {
            "id": t["id"],
            "name": t["name"],
            "status": t.get("status", {}).get("status"),
            "list": t.get("list", {}).get("name"),
            "updated": t.get("date_updated"),
        }
        for t in res.get("tasks", [])[: args.limit]
    ]


def cmd_comment(token, args):
    res = http("POST", f"/task/{args.task_id}/comment", token, body={"comment_text": args.body})
    return {"id": res.get("id"), "ok": True}


def cmd_update(token, args):
    body = {}
    if args.status:
        body["status"] = args.status
    res = http("PUT", f"/task/{args.task_id}", token, body=body)
    return {"id": res.get("id"), "status": res.get("status", {}).get("status")}


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_tasks = sub.add_parser("tasks")
    p_tasks.add_argument("list_id")
    p_tasks.add_argument("--status")
    p_tasks.add_argument("--limit", type=int, default=50)

    p_task = sub.add_parser("task")
    p_task.add_argument("task_id")

    p_search = sub.add_parser("search")
    p_search.add_argument("query")
    p_search.add_argument("--limit", type=int, default=20)

    p_lists = sub.add_parser("lists")
    p_lists.add_argument("--space")

    sub.add_parser("spaces")

    p_recent = sub.add_parser("recent")
    p_recent.add_argument("--days", type=int, default=7)
    p_recent.add_argument("--limit", type=int, default=50)

    p_comment = sub.add_parser("comment")
    p_comment.add_argument("task_id")
    p_comment.add_argument("body")

    p_update = sub.add_parser("update")
    p_update.add_argument("task_id")
    p_update.add_argument("--status")

    args = parser.parse_args()

    load_dotenv()
    token, ws = resolve_credentials()

    if args.cmd == "tasks":
        out = cmd_tasks(token, args)
    elif args.cmd == "task":
        out = cmd_task(token, args)
    elif args.cmd == "search":
        out = cmd_search(token, ws, args)
    elif args.cmd == "lists":
        out = cmd_lists(token, ws, args)
    elif args.cmd == "spaces":
        out = cmd_spaces(token, ws)
    elif args.cmd == "recent":
        out = cmd_recent(token, ws, args)
    elif args.cmd == "comment":
        out = cmd_comment(token, args)
    elif args.cmd == "update":
        out = cmd_update(token, args)
    else:
        parser.error("unknown command")

    print(json.dumps({"result": out}, indent=2, default=str))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        sys.stderr.write(f"ERROR: {e}\n")
        sys.exit(1)
