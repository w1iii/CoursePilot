-- CoursePilot schema: Supabase PostgreSQL
-- Run this in the Supabase SQL editor (or psql) once per project.
-- RAG vectors live in a separate database.

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
-- RAG documents/chunks live in the separate CoursePilot-RAG database.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- RLS: keep rows private per user. All app access uses the service-role key
-- from route handlers (which bypasses RLS); enable this for any direct access.
-- ---------------------------------------------------------------------------
alter table public.users         enable row level security;
alter table public.courses       enable row level security;
alter table public.academic_tasks enable row level security;
alter table public.announcements enable row level security;
