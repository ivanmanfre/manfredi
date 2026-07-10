# Supabase — the cloud memory layer (optional, ~10 min)

Your `memory/` files already work **locally** with zero setup — the `recall` skill
searches them right away. Supabase adds a cloud mirror so your memory is backed up,
searchable across devices, and (later) searchable by meaning, not just keywords.

You don't have to do this on day one. When you're ready, the `getting-started`
tutorial walks you through it, or follow these steps.

## 1. Create a project
1. Go to https://supabase.com → sign in → **New project**.
2. Pick a name and a strong database password. Choose a region near you.
3. Wait ~2 minutes for it to provision.

## 2. Create the memory table
1. In your project: **SQL Editor → New query**.
2. Open [`schema.sql`](schema.sql), copy all of it, paste, and **Run**.
3. You should see "Success." That created the `claude_memory` table and two search
   functions.

## 3. Get your keys
1. **Project Settings → API.**
2. Copy the **Project URL** → put it in `.env` as `SUPABASE_URL`.
3. Copy the **service_role** key (under "Project API keys") → put it in `.env` as
   `SUPABASE_KEY`.
   - ⚠️ The service_role key is powerful and bypasses security rules. It's fine here
     because it only ever lives in your private `.env` on your own machine. **Never**
     put it in a website, a browser app, or git.

## 4. Push your memory up
From the repo root:

```bash
python3 .claude/hooks/memory-sync.py --force
```

This uploads your `memory/` files to Supabase. Re-run it anytime (it only sends
what changed). You can also let it run automatically — see `.claude/settings.json`.

## 5. Confirm it works
```bash
python3 .claude/skills/recall/recall.py "deploy"
```
You should see a `## cloud (keyword)` section in the results alongside local hits.

---

## Advanced — semantic ("by meaning") search
Keyword search finds exact words. Semantic search finds *related* ideas even when the
words differ. It needs an **embedding** for each memory (a list of numbers) stored in
the `embedding` column. To turn it on you add an embedding step (e.g. OpenAI
`text-embedding-3-small`, which matches the `vector(1536)` column in `schema.sql`) to
the sync, then `recall` will use `match_memories`. This is a later upgrade — keyword
search is plenty to start. Ask Claude: *"help me add embeddings to memory-sync."*
