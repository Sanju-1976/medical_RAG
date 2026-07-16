-- ============================================================
-- Clinical Clarity — Database Schema (384-dim, HNSW index)
-- Re-run this in Supabase SQL Editor to refresh the schema.
-- ============================================================

-- Enable pgvector
create extension if not exists vector;

-- Drop and recreate tables (safe when no data yet)
drop table if exists chat_messages cascade;
drop table if exists chat_sessions cascade;
drop table if exists document_chunks cascade;
drop table if exists documents cascade;

-- Documents
create table documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid,
  name          text not null,
  file_path     text,
  file_size     bigint,
  lab_name      text,
  report_date   date,
  created_at    timestamptz default now()
);

-- Document chunks with 384-dim embeddings (all-MiniLM-L6-v2)
create table document_chunks (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid references documents(id) on delete cascade,
  content       text not null,
  embedding     vector(384),
  chunk_index   int,
  page_number   int,
  created_at    timestamptz default now()
);

-- HNSW index — works well on any dataset size (no minimum row count)
-- ivfflat needs 100+ rows; HNSW works from 1 row onward
create index document_chunks_embedding_idx
  on document_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- Chat sessions
create table chat_sessions (
  id            uuid primary key default gen_random_uuid(),
  document_id   uuid references documents(id) on delete cascade,
  title         text,
  created_at    timestamptz default now()
);

-- Chat messages
create table chat_messages (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid references chat_sessions(id) on delete cascade,
  role          text check (role in ('user', 'assistant')) not null,
  content       text not null,
  sources       jsonb,
  created_at    timestamptz default now()
);

-- ============================================================
-- Similarity search RPC
-- threshold = 0.15 — MiniLM cosine scores are lower than OpenAI
-- ============================================================
create or replace function match_document_chunks(
  query_embedding   vector(384),
  match_document_id uuid,
  match_count       int   default 6,
  match_threshold   float default 0.15
)
returns table (
  id          uuid,
  content     text,
  chunk_index int,
  page_number int,
  similarity  float
)
language sql stable
as $$
  select
    dc.id,
    dc.content,
    dc.chunk_index,
    dc.page_number,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  where dc.document_id = match_document_id
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;
