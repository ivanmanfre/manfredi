---
name: brain
description: Use when answering an entity-scoped, relational, or "by meaning" question about your own memory — "what did we decide about X", "everything related to Y", "all the rules about Z", "find the memory about <idea> even if I don't know the exact words", "what connects to <client/project/topic>". The skill for questions where the answer is spread across several memory files and you want it synthesized, not just a list of file:line hits. For a single known fact (an ID, a key, one decision), the lighter `recall` skill is enough.
---

# brain — synthesize answers across your memory

`recall` finds *where* a fact lives. `brain` answers a *question* by gathering the
relevant memories — across local tiers and the cloud mirror — and synthesizing them
into one answer with citations. Reach for it when the question is entity-scoped
("everything about <client>"), relational ("what connects to <topic>"), or fuzzy
("the rule about X, by meaning") and the answer spans more than one file.

## When to use vs. recall

- **`recall`** — you want a specific stored fact and roughly know its words. Returns
  ranked `file:line` hits. Cheap, fast, first stop for "what's the ID for X".
- **`brain`** — you want a *synthesized answer* drawn from several memories: "what did
  we decide about pricing", "everything related to project Y", "all the rules touching
  Z". This skill runs the search, *reads* the top files, and writes the answer.

If a question makes you want to grep the whole `memory/` folder and read five files to
piece an answer together — that's this skill.

## How it works today (keyword + read + synthesize)

There is **no custom retrieval engine** in this repo — `brain` is a procedure, not an
endpoint. It leans on the same cloud **keyword** search the `recall` skill uses (the
`search_memories` RPC), plus reading the matched memory files, then synthesizes.

1. **Search.** Run the recall search from the repo root with the user's natural phrasing:

   ```bash
   python3 .claude/skills/recall/recall.py "<the user's question, verbatim>"
   ```

   This searches all local tiers (`global`, `shared`, `project`) and — when
   `SUPABASE_URL` + `SUPABASE_KEY` are in `.env` — the cloud `claude_memory` mirror by
   keyword (`search_memories`). Without the cloud layer, local search still works fully.

2. **Broaden if entity/relational.** Keyword search misses synonyms and links. If the
   question is about an entity or its connections:
   - Re-run the search with 2–3 alternate phrasings (the entity's other names, the
     topic's synonyms).
   - To find what *links to* an entity, grep the memory files for wikilinks and mentions:

     ```bash
     grep -rin "\[\[.*<slug>.*\]\]\|<entity name>" memory/
     ```

     `[[name-slug]]` links (see `memory/README.md`) are your relation graph here.

3. **Read the top files.** Open the highest-ranked matches end to end — don't answer
   from the one-line `summary` alone. The real decision usually has nuance the snippet
   drops.

4. **Synthesize and cite.** Write one coherent answer. Cite each load-bearing claim
   with its `file:line` (e.g. `project/pricing-rules.md:12`) so the user can verify.
   If memories conflict, surface the conflict and prefer the more recent / more
   specific one rather than silently picking.

5. **Be honest about gaps.** If nothing relevant turns up, say so plainly — do not
   invent a memory. If you only found a partial answer, say which part is missing.

## The "by meaning" caveat (read this)

Right now retrieval is **keyword-based**. It finds memories that share *words* with the
query, not ones that share *meaning*. So "find the rule about onboarding" may miss a
memory phrased as "new-client setup checklist." Mitigations:

- Search with several phrasings (step 2) instead of trusting one query.
- Fall back to reading `memory/MEMORY.md` (the always-loaded index) and scanning its
  one-line pointers for topically related files the keyword search didn't surface.

**True semantic ("by meaning") search is a documented upgrade, not a missing feature.**
It turns on once embeddings are added to `memory-sync` and `recall` starts using the
`match_memories` vector RPC. See `supabase/README.md` → **Advanced — semantic search**
(add an embedding step such as OpenAI `text-embedding-3-small`, matching the
`vector(1536)` column in `supabase/schema.sql`). After that upgrade, step 1's search
becomes meaning-aware and this caveat goes away — the rest of the procedure is unchanged.

## Anti-patterns (stop doing these)

- Answering an "everything about X" question from a **single** `recall` hit → read the
  matched files first, then synthesize.
- Guessing an entity's exact slug before searching → search the user's natural phrasing
  first; the matched file's `name:` is the canonical slug.
- Trusting one keyword query for a fuzzy question → try 2–3 phrasings, then scan
  `MEMORY.md`, before concluding "no memory."
- Inventing a relationship the memories don't state → only report links you can cite.

## Output shape

A short synthesized answer, then a **Sources** list of `file:line` citations. If the
answer is incomplete or relies on keyword luck, note that explicitly so the user knows
when to upgrade to semantic search.
