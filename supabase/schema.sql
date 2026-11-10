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
-- Canvas Accounts  (One User -> One Connection per Canvas Host)
-- Personal access tokens are encrypted at rest with AES-256-GCM.
-- ---------------------------------------------------------------------------
create table if not exists public.canvas_accounts (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.users(id) on delete cascade,
  canvas_base_url           text not null,
  canvas_user_id            bigint,
  canvas_user_name          text,
  access_token_encrypted    text not null,
  token_last_validated_at   timestamptz,
  invalid_at                timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  unique (user_id, canvas_base_url)
);

create index if not exists canvas_accounts_user_id_idx
  on public.canvas_accounts (user_id);

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
  rag_indexed_at    timestamptz,
  rag_document_count int,
  rag_chunk_count   int,
  rag_failure_count int,
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
  removed_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists academic_tasks_course_id_idx
  on public.academic_tasks (course_id);
create index if not exists academic_tasks_due_date_idx
  on public.academic_tasks (due_date);
create index if not exists academic_tasks_open_idx
  on public.academic_tasks (course_id, removed_at);
create unique index if not exists academic_tasks_canvas_unique_idx
  on public.academic_tasks (course_id, canvas_task_id)
  where canvas_task_id is not null;

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
  removed_at               timestamptz,
  created_at               timestamptz not null default now(),
  unique (course_id, canvas_announcement_id)
);

create index if not exists announcements_course_id_idx
  on public.announcements (course_id);
create index if not exists announcements_open_idx
  on public.announcements (course_id, removed_at);

-- ---------------------------------------------------------------------------
-- Deadline Changes  (Canvas due-date moves detected during sync)
-- ---------------------------------------------------------------------------
create table if not exists public.deadline_changes (
  id            uuid primary key default gen_random_uuid(),
  task_id       uuid references public.academic_tasks(id) on delete cascade,
  course_id     uuid not null references public.courses(id) on delete cascade,
  title         text not null,
  old_due_date  timestamptz,
  new_due_date  timestamptz not null,
  detected_at   timestamptz not null default now()
);

create index if not exists deadline_changes_course_id_idx
  on public.deadline_changes (course_id, detected_at desc);

-- ---------------------------------------------------------------------------
-- AI Requests  (Latency/error telemetry; prompts are never stored)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_requests (
  id                bigint generated always as identity primary key,
  user_id           uuid references public.users(id) on delete set null,
  feature           text not null,
  model             text,
  latency_ms        integer not null default 0,
  status            text not null check (status in ('ok', 'error')),
  error             text,
  prompt_tokens     integer,
  completion_tokens integer,
  cache_hit         boolean not null default false,
  created_at        timestamptz not null default now()
);

alter table public.ai_requests
  add column if not exists cache_hit boolean not null default false;

create index if not exists ai_requests_user_created_idx
  on public.ai_requests (user_id, created_at desc);
create index if not exists ai_requests_feature_created_idx
  on public.ai_requests (feature, created_at desc);

-- ---------------------------------------------------------------------------
-- Rate Limit Windows  (Per-user minute/day counters for expensive routes)
-- Backed by Postgres so it works on serverless hosts without extra services.
-- ---------------------------------------------------------------------------
create table if not exists public.rate_limit_windows (
  user_id       uuid not null references public.users(id) on delete cascade,
  window_kind   text not null check (window_kind in ('minute', 'day')),
  window_start  timestamptz not null,
  count         integer not null default 1,
  primary key (user_id, window_kind, window_start)
);

create index if not exists rate_limit_windows_start_idx
  on public.rate_limit_windows (window_start);

-- ---------------------------------------------------------------------------
-- Per-user sync lease. Lease expiry recovers locks after process termination.
-- ---------------------------------------------------------------------------
create table if not exists public.sync_locks (
  user_id uuid primary key references public.users(id) on delete cascade,
  lock_token uuid not null,
  expires_at timestamptz not null
);

create or replace function public.try_acquire_sync_lock(
  p_user_id uuid,
  p_lock_token uuid,
  p_lease_seconds integer default 600
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  insert into public.sync_locks(user_id, lock_token, expires_at)
  values (p_user_id, p_lock_token, now() + make_interval(secs => greatest(30, least(p_lease_seconds, 1800))))
  on conflict (user_id) do update
    set lock_token = excluded.lock_token,
        expires_at = excluded.expires_at
    where public.sync_locks.expires_at <= now();
  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;

create or replace function public.release_sync_lock(
  p_user_id uuid,
  p_lock_token uuid
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  delete from public.sync_locks
  where user_id = p_user_id and lock_token = p_lock_token;
  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;

revoke all on function public.try_acquire_sync_lock(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.release_sync_lock(uuid, uuid) from public, anon, authenticated;
grant execute on function public.try_acquire_sync_lock(uuid, uuid, integer) to service_role;
grant execute on function public.release_sync_lock(uuid, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Chat Threads and Messages
-- ---------------------------------------------------------------------------
create table if not exists public.chat_threads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  course_id   uuid references public.courses(id) on delete set null,
  title       text not null default 'New chat',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists chat_threads_user_updated_idx
  on public.chat_threads (user_id, updated_at desc);

create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.chat_threads(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  status      text not null default 'complete'
              check (status in ('pending', 'complete', 'error')),
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists chat_messages_thread_created_idx
  on public.chat_messages (thread_id, created_at);

-- Deploy this RPC before deploying the thread API that calls it.
create or replace function public.save_chat_thread(
  p_thread_id uuid, p_user_id uuid, p_course_id uuid, p_title text, p_messages jsonb
) returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_owner uuid;
begin
  if jsonb_typeof(p_messages) is distinct from 'array' or
     jsonb_array_length(p_messages) > 200 or length(p_title) > 120 then
    raise exception 'Invalid thread';
  end if;
  if p_course_id is not null and not exists (
    select 1 from public.courses where id = p_course_id and user_id = p_user_id
  ) then
    raise exception 'Course not found';
  end if;

  select user_id into v_owner from public.chat_threads where id = p_thread_id for update;
  if v_owner is not null and v_owner <> p_user_id then
    raise exception 'Thread not found';
  end if;
  if v_owner is null then
    if jsonb_array_length(p_messages) = 0 then raise exception 'Thread not found'; end if;
    insert into public.chat_threads (id, user_id, course_id, title)
    values (p_thread_id, p_user_id, p_course_id, p_title);
  else
    update public.chat_threads set course_id = p_course_id, title = p_title, updated_at = now()
    where id = p_thread_id;
  end if;

  delete from public.chat_messages where thread_id = p_thread_id;
  insert into public.chat_messages (id, thread_id, role, content, status, metadata, created_at)
  select id, p_thread_id, role, content, status, metadata, created_at
  from jsonb_to_recordset(p_messages) as m(
    id uuid, role text, content text, status text, metadata jsonb, created_at timestamptz
  );
end;
$$;
revoke all on function public.save_chat_thread(uuid, uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.save_chat_thread(uuid, uuid, uuid, text, jsonb) to service_role;

-- Atomically count a request and report whether it is within the limits.
-- Blocked requests only bump the minute counter, so spam cannot extend a
-- day-level lockout. Old windows are pruned opportunistically.
create or replace function public.check_rate_limit(
  p_user_id      uuid,
  p_minute_limit integer default 10,
  p_day_limit    integer default 200
)
returns table (allowed boolean, exceeded_scope text, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now            timestamptz := now();
  v_minute_start   timestamptz := date_trunc('minute', v_now);
  v_day_start      timestamptz := date_trunc('day', v_now);
  v_minute_count   integer;
  v_day_count      integer;
begin
  delete from public.rate_limit_windows
   where window_start < v_now - interval '2 days';

  insert into public.rate_limit_windows (user_id, window_kind, window_start, count)
  values (p_user_id, 'minute', v_minute_start, 1)
  on conflict (user_id, window_kind, window_start)
  do update set count = public.rate_limit_windows.count + 1
  returning count into v_minute_count;

  if v_minute_count > p_minute_limit then
    return query select
      false,
      'minute'::text,
      greatest(
        1,
        ceil(extract(epoch from (v_minute_start + interval '1 minute' - v_now)))::integer
      );
    return;
  end if;

  insert into public.rate_limit_windows (user_id, window_kind, window_start, count)
  values (p_user_id, 'day', v_day_start, 1)
  on conflict (user_id, window_kind, window_start)
  do update set count = public.rate_limit_windows.count + 1
  returning count into v_day_count;

  if v_day_count > p_day_limit then
    return query select
      false,
      'day'::text,
      greatest(
        1,
        ceil(extract(epoch from (v_day_start + interval '1 day' - v_now)))::integer
      );
    return;
  end if;

  return query select true, null::text, 0;
end;
$$;
revoke all on function public.check_rate_limit(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(uuid, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- RAG documents/chunks live in the separate CoursePilot-RAG database.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- RLS: keep rows private per user. All app access uses the service-role key
-- from route handlers (which bypasses RLS); enable this for any direct access.
-- ---------------------------------------------------------------------------
alter table public.users         enable row level security;
alter table public.courses       enable row level security;
alter table public.canvas_accounts enable row level security;
alter table public.academic_tasks enable row level security;
alter table public.announcements enable row level security;
alter table public.deadline_changes enable row level security;
alter table public.ai_requests enable row level security;
alter table public.rate_limit_windows enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
