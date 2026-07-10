#!/usr/bin/env python3
"""
pipedrive.py — query your Pipedrive CRM via the REST API. MCP-free.

Reads your Pipedrive domain + API token from environment variables (or a .env
file at the repo root) and hits the Pipedrive REST API directly. Read-only: it
looks things up, it never creates, edits, or deletes records.

Setup (once):
  In .env at the repo root set:
    PIPEDRIVE_DOMAIN=yourcompany        # the bit before .pipedrive.com
    PIPEDRIVE_API_TOKEN=...             # Pipedrive -> Settings -> Personal -> API
  (A full domain like "yourcompany.pipedrive.com" or a URL also works.)

Usage:
  pipedrive.py summary                       # open deals: count + value, by stage
  pipedrive.py deals [--status open|won|lost|all] [--limit N]
  pipedrive.py deal <id>
  pipedrive.py search <query>                # deals + people + organizations
  pipedrive.py persons [--limit N]
  pipedrive.py pipelines                     # pipelines and their stages
  pipedrive.py activities [--overdue] [--limit N]   # open (not-done) activities
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, datetime
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
    """Return (base_url, api_token)."""
    load_dotenv()
    raw = (os.environ.get("PIPEDRIVE_DOMAIN") or "").strip()
    token = os.environ.get("PIPEDRIVE_API_TOKEN") or ""
    if not raw or not token:
        raise RuntimeError(
            "Missing Pipedrive credentials. Set PIPEDRIVE_DOMAIN and "
            "PIPEDRIVE_API_TOKEN in your environment or in a .env file at the "
            "repo root (see .env.example)."
        )
    # Normalize whatever form the domain was given in -> just the subdomain.
    raw = raw.replace("https://", "").replace("http://", "").rstrip("/")
    raw = raw.split("/")[0]
    raw = raw.replace(".pipedrive.com", "")
    return f"https://{raw}.pipedrive.com/api/v1", token


def http_get(base: str, token: str, path: str, params: dict | None = None, timeout: int = 15) -> dict:
    params = dict(params or {})
    params["api_token"] = token
    url = f"{base}{path}?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="ignore")[:200]
        hint = ""
        if e.code in (401, 403):
            hint = " — check PIPEDRIVE_API_TOKEN"
        elif e.code == 404:
            hint = " — check PIPEDRIVE_DOMAIN (the bit before .pipedrive.com)"
        raise RuntimeError(f"Pipedrive HTTP {e.code}: {body}{hint}")
    except urllib.error.URLError as e:
        raise RuntimeError(f"Could not reach Pipedrive: {e.reason} — check PIPEDRIVE_DOMAIN")


def _name(obj):
    """Pipedrive returns related records as either an id or a {name,...} object."""
    if isinstance(obj, dict):
        return obj.get("name") or obj.get("value")
    return obj


def deal_row(d: dict) -> dict:
    return {
        "id": d.get("id"),
        "title": d.get("title"),
        "value": d.get("value"),
        "currency": d.get("currency"),
        "status": d.get("status"),
        "stage_id": d.get("stage_id"),
        "person": _name(d.get("person_id")),
        "org": _name(d.get("org_id")),
        "owner": d.get("owner_name"),
        "updated": d.get("update_time"),
    }


def cmd_deals(base, token, args):
    params = {"limit": args.limit, "sort": "update_time DESC"}
    if args.status and args.status != "all":
        params["status"] = args.status
    data = http_get(base, token, "/deals", params).get("data") or []
    return [deal_row(d) for d in data]


def cmd_deal(base, token, args):
    return (http_get(base, token, f"/deals/{args.id}").get("data")) or {}


def cmd_search(base, token, args):
    params = {"term": args.query, "item_types": "deal,person,organization", "limit": 20}
    items = (http_get(base, token, "/itemSearch", params).get("data") or {}).get("items") or []
    out = []
    for it in items:
        item = it.get("item") or {}
        out.append({
            "type": item.get("type"),
            "id": item.get("id"),
            "title": item.get("title") or item.get("name"),
            "score": round(it.get("result_score", 0), 3),
        })
    return out


def cmd_persons(base, token, args):
    data = http_get(base, token, "/persons", {"limit": args.limit, "sort": "update_time DESC"}).get("data") or []
    return [
        {
            "id": p.get("id"),
            "name": p.get("name"),
            "org": _name(p.get("org_id")),
            "email": (p.get("email") or [{}])[0].get("value") if isinstance(p.get("email"), list) else p.get("email"),
            "open_deals": p.get("open_deals_count"),
        }
        for p in data
    ]


def cmd_pipelines(base, token, args):
    pipelines = http_get(base, token, "/pipelines").get("data") or []
    stages = http_get(base, token, "/stages").get("data") or []
    by_pipe = defaultdict(list)
    for s in sorted(stages, key=lambda x: x.get("order_nr", 0)):
        by_pipe[s.get("pipeline_id")].append({"id": s.get("id"), "name": s.get("name")})
    return [
        {"id": p.get("id"), "name": p.get("name"), "stages": by_pipe.get(p.get("id"), [])}
        for p in pipelines
    ]


def cmd_activities(base, token, args):
    data = http_get(base, token, "/activities", {"done": 0, "limit": args.limit}).get("data") or []
    today = date.today().isoformat()
    out = []
    for a in data:
        due = a.get("due_date")
        if args.overdue and not (due and due < today):
            continue
        out.append({
            "id": a.get("id"),
            "subject": a.get("subject"),
            "type": a.get("type"),
            "due_date": due,
            "overdue": bool(due and due < today),
            "deal": a.get("deal_title"),
            "person": a.get("person_name"),
            "owner": a.get("owner_name"),
        })
    return out


def cmd_summary(base, token, args):
    data = http_get(base, token, "/deals", {"status": "open", "limit": 500}).get("data") or []
    by_currency = defaultdict(float)
    by_stage = defaultdict(int)
    for d in data:
        try:
            by_currency[d.get("currency") or "?"] += float(d.get("value") or 0)
        except (TypeError, ValueError):
            pass
        by_stage[d.get("stage_id")] += 1
    return {
        "open_deals": len(data),
        "value_by_currency": {k: round(v, 2) for k, v in by_currency.items()},
        "deals_by_stage_id": dict(by_stage),
    }


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("summary")

    p = sub.add_parser("deals")
    p.add_argument("--status", default="open", choices=["open", "won", "lost", "all"])
    p.add_argument("--limit", type=int, default=50)

    p = sub.add_parser("deal")
    p.add_argument("id")

    p = sub.add_parser("search")
    p.add_argument("query")

    p = sub.add_parser("persons")
    p.add_argument("--limit", type=int, default=50)

    sub.add_parser("pipelines")

    p = sub.add_parser("activities")
    p.add_argument("--overdue", action="store_true")
    p.add_argument("--limit", type=int, default=100)

    args = parser.parse_args()
    base, token = resolve_creds()

    handler = {
        "summary": cmd_summary, "deals": cmd_deals, "deal": cmd_deal,
        "search": cmd_search, "persons": cmd_persons, "pipelines": cmd_pipelines,
        "activities": cmd_activities,
    }[args.cmd]
    out = handler(base, token, args)

    safe_base = base  # base has no token in it
    print(json.dumps({"pipedrive": safe_base, "result": out}, indent=2, default=str))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        sys.stderr.write(f"ERROR: {e}\n")
        sys.exit(1)
