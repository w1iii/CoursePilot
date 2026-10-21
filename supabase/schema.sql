-- CoursePilot schema: PostgreSQL (Supabase) + pgvector
-- Run this in the Supabase SQL editor (or psql) once per project.

create extension if not exists vector;

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id             uuid primary key default gen_random_uuid(),
  clerk_user_id  text not null unique,
  email          text not null,
  full_name      text,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Courses  (One User -> Many Courses)
-- ---------------------------------------------------------------------------
create table if not exists public.courses (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  canvas_course_id  bigint not null,
  course_code       text,
  course_name       text not null,
  instructor        text,
  semester          text,
  created_at        timestamptz not null default now(),
  unique (user_id, canvas_course_id)
);

-- ---------------------------------------------------------------------------
-- Academic Tasks  (One Course -> Many Academic Tasks)
-- ---------------------------------------------------------------------------
create table if not exists public.academic_tasks (
  id              uuid primary key default gen_random_uuid(),
  course_id       uuid not null references public.courses(id) on delete cascade,
  canvas_task_id  bigint,
  title           text not null,
  description     text,
  type            text not null default 'assignment'
                    check (type in ('assignment','quiz','exam','project','activity','reading')),
  due_date        timestamptz,
  priority        text not null default 'medium'
                    check (priority in ('low','medium','high')),
  status          text not null default 'pending'
                    check (status in ('pending','completed')),
  is_manual       boolean not null default false,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists academic_tasks_course_id_idx
  on public.academic_tasks (course_id);
create index if not exists academic_tasks_due_date_idx
  on public.academic_tasks (due_date);

-- ---------------------------------------------------------------------------
-- Announcements  (One Course -> Many Announcements)
-- ---------------------------------------------------------------------------
create table if not exists public.announcements (
  id                       uuid primary key default gen_random_uuid(),
  course_id                uuid not null references public.courses(id) on delete cascade,
  canvas_announcement_id   bigint not null,
  title                    text not null,
  content                  text,
  importance_score         real,
  posted_at                timestamptz,
  created_at               timestamptz not null default now(),
  unique (course_id, canvas_announcement_id)
);

create index if not exists announcements_course_id_idx
  on public.announcements (course_id);

-- ---------------------------------------------------------------------------
-- Documents  (RAG knowledge base; One Course -> Many Documents)
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references public.courses(id) on delete cascade,
  source_type   text not null
                  check (source_type in ('announcement','module','page','assignment','syllabus')),
  source_id     bigint,
  title         text not null,
  content       text not null,
  embedding     vector(1536),
  indexed_at    timestamptz not null default now()
);

create unique index if not exists documents_source_unique
  on public.documents (course_id, source_type, source_id);

create index if not exists documents_course_id_idx
  on public.documents (course_id);

-- Cosine similarity index for pgvector retrieval.
create index if not exists documents_embedding_idx
  on public.documents
  using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- Vector search RPC used by the RAG pipeline.
-- ---------------------------------------------------------------------------
create or replace function public.match_documents (
  query_embedding vector(1536),
  match_user_id   uuid,
  match_count     int default 8,
  similarity_cut  float default 0.2
)
returns table (
  id           uuid,
  course_id    uuid,
  source_type  text,
  title        text,
  content      text,
  similarity   float
)
language sql stable
as $$
  select
    d.id,
    d.course_id,
    d.source_type,
    d.title,
    d.content,
    1 - (d.embedding <=> query_embedding) as similarity
  from public.documents d
  join public.courses c on c.id = d.course_id
  where c.user_id = match_user_id
    and d.embedding is not null
    and 1 - (d.embedding <=> query_embedding) >= similarity_cut
  order by d.embedding <=> query_embedding
  limit match_count;
$$;

-- ---------------------------------------------------------------------------
-- RLS: keep rows private per user. All app access uses the service-role key
-- from route handlers (which bypasses RLS); enable this for any direct access.
-- ---------------------------------------------------------------------------
alter table public.users         enable row level security;
alter table public.courses       enable row level security;
alter table public.academic_tasks enable row level security;
alter table public.announcements enable row level security;
alter table public.documents     enable row level security;
