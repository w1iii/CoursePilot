-- Study Prep: reusable generated packs and per-user study sessions.
alter table public.courses add constraint courses_id_user_id_unique unique (id, user_id);
create table public.study_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  course_id uuid not null,
  title text not null check (length(title) between 1 and 200),
  mode text not null check (mode in ('flashcards', 'quiz', 'mixed')),
  topic text check (topic is null or length(topic) <= 300),
  module text check (module is null or length(module) <= 200),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard', 'mixed')),
  item_count integer not null check (item_count between 1 and 50),
  source_index_version text not null,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (course_id, user_id) references public.courses(id, user_id) on delete cascade
);
create index study_packs_owner_created_idx on public.study_packs(user_id, created_at desc);
create index study_packs_course_idx on public.study_packs(user_id, course_id);

create table public.study_pack_items (
  id uuid primary key default gen_random_uuid(),
  pack_id uuid not null references public.study_packs(id) on delete cascade,
  item_order integer not null check (item_order >= 0),
  item_type text not null check (item_type in ('flashcard', 'multiple_choice', 'short_answer')),
  question text not null check (length(question) between 1 and 4000),
  answer text not null check (length(answer) between 1 and 4000),
  explanation text not null check (length(explanation) between 1 and 4000),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  correct_option integer,
  citations jsonb not null check (jsonb_typeof(citations) = 'array' and jsonb_array_length(citations) > 0),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  unique (pack_id, item_order),
  check ((item_type = 'multiple_choice' and correct_option is not null and correct_option >= 0)
      or (item_type <> 'multiple_choice' and correct_option is null))
);
create index study_pack_items_pack_order_idx on public.study_pack_items(pack_id, item_order);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  pack_id uuid not null,
  current_item integer not null default 0 check (current_item >= 0),
  status text not null default 'in_progress' check (status in ('in_progress', 'paused', 'completed')),
  score integer not null default 0 check (score >= 0),
  started_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (id, user_id),
  foreign key (pack_id, user_id) references public.study_packs(id, user_id) on delete cascade,
  check ((status = 'completed' and completed_at is not null) or status <> 'completed')
);
create index study_sessions_owner_active_idx on public.study_sessions(user_id, status, last_active_at desc);
create index study_sessions_pack_idx on public.study_sessions(user_id, pack_id, started_at desc);

create table public.study_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  item_id uuid not null references public.study_pack_items(id) on delete cascade,
  answer text not null check (length(answer) <= 4000),
  is_correct boolean not null,
  confidence integer check (confidence between 1 and 5),
  created_at timestamptz not null default now(),
  unique (session_id, item_id)
);
create index study_attempts_session_idx on public.study_attempts(session_id, created_at);

alter table public.study_packs enable row level security;
alter table public.study_pack_items enable row level security;
alter table public.study_sessions enable row level security;
alter table public.study_attempts enable row level security;
