-- claude_memory — the cloud mirror of your local memory/ files.
-- Run this once in your Supabase project (SQL Editor → paste → Run).
-- It enables fast keyword search immediately, and semantic (vector) search once
-- you start filling in embeddings (see supabase/README.md → "Advanced").

create extension if not exists vector;

create table if not exists claude_memory (
  id           bigint generated always as identity primary key,
  client_id    text not null default 'global',     -- tier namespace: 'global' | 'shared-tech' | '<project-name>'
  file_path    text not null,                       -- e.g. 'global/example-user.md'
  content      text not null,
  content_hash text,
  embedding    vector(1536),                        -- optional; fill via an embedding step for semantic search
  fts          tsvector generated always as (to_tsvector('english', content)) stored,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (client_id, file_path)
);

create index if not exists claude_memory_client_idx    on claude_memory (client_id);
create index if not exists claude_memory_fts_idx        on claude_memory using gin (fts);
create index if not exists claude_memory_embedding_idx  on claude_memory using hnsw (embedding vector_cosine_ops);

-- Keyword search — works the moment your files are synced (no embeddings needed).
create or replace function search_memories(
  query_text text,
  filter_client_ids text[] default null,
  match_count int default 8
)
returns table (client_id text, file_path text, content text, rank real)
language sql stable as $$
  select m.client_id, m.file_path, m.content,
         ts_rank(m.fts, websearch_to_tsquery('english', query_text)) as rank
  from claude_memory m
  where (filter_client_ids is null or m.client_id = any (filter_client_ids))
    and m.fts @@ websearch_to_tsquery('english', query_text)
  order by rank desc
  limit match_count;
$$;

-- Semantic search — the upgrade. Requires the embedding column to be populated.
create or replace function match_memories(
  query_embedding vector(1536),
  filter_client_ids text[] default null,
  match_count int default 8
)
returns table (client_id text, file_path text, content text, similarity real)
language sql stable as $$
  select m.client_id, m.file_path, m.content,
         1 - (m.embedding <=> query_embedding) as similarity
  from claude_memory m
  where m.embedding is not null
    and (filter_client_ids is null or m.client_id = any (filter_client_ids))
  order by m.embedding <=> query_embedding
  limit match_count;
$$;
