---
name: supabase-patterns
description: Supabase REST/auth basics, pgvector for memory search, and migration gotchas.
type: reference
---

Reusable Supabase facts (true across projects). The cloud memory layer uses these.

- **REST:** `https://<project-ref>.supabase.co/rest/v1/<table>` with headers `apikey: <key>` and `Authorization: Bearer <key>`. Add `Prefer: return=representation` to get rows back on insert.
- **Keys:** the **service-role** key bypasses RLS (server-side only — never ship it to a browser). The **anon** key is for client apps and respects RLS.
- **`Prefer: resolution=merge-duplicates`** on POST does an upsert (needs a unique constraint).
- **pgvector** powers semantic memory search: store an `embedding vector(N)` column, create an `ivfflat` or `hnsw` index, and query with `<=>` (cosine distance) inside a SQL function. See [`../supabase/schema.sql`](../supabase/schema.sql).
- **Migrations:** keep schema changes as `.sql` files in `supabase/` and apply them in order, so the database is reproducible from the repo.
