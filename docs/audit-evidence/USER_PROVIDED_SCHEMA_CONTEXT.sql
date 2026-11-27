-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL UNIQUE,
  email text NOT NULL,
  full_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  onboarding_completed_at timestamp with time zone,
  username text,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  canvas_course_id bigint NOT NULL,
  course_code text,
  course_name text NOT NULL,
  instructor text,
  semester text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  rag_indexed_at timestamp with time zone,
  rag_document_count integer,
  rag_chunk_count integer,
  rag_failure_count integer,
  selected_for_rag boolean NOT NULL DEFAULT false,
  CONSTRAINT courses_pkey PRIMARY KEY (id),
  CONSTRAINT courses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.academic_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  canvas_task_id bigint,
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'assignment'::text CHECK (type = ANY (ARRAY['assignment'::text, 'quiz'::text, 'exam'::text, 'project'::text, 'activity'::text, 'reading'::text])),
  due_date timestamp with time zone,
  priority text NOT NULL DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text])),
  is_manual boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  removed_at timestamp with time zone,
  CONSTRAINT academic_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT academic_tasks_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  canvas_announcement_id bigint NOT NULL,
  title text NOT NULL,
  content text,
  importance_score real,
  posted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  removed_at timestamp with time zone,
  CONSTRAINT announcements_pkey PRIMARY KEY (id),
  CONSTRAINT announcements_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.canvas_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  canvas_base_url text NOT NULL,
  canvas_user_id bigint,
  canvas_user_name text,
  access_token_encrypted text NOT NULL,
  token_last_validated_at timestamp with time zone,
  invalid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT canvas_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT canvas_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.rate_limit_windows (
  user_id uuid NOT NULL,
  window_kind text NOT NULL CHECK (window_kind = ANY (ARRAY['minute'::text, 'day'::text])),
  window_start timestamp with time zone NOT NULL,
  count integer NOT NULL DEFAULT 1,
  CONSTRAINT rate_limit_windows_pkey PRIMARY KEY (user_id, window_kind, window_start),
  CONSTRAINT rate_limit_windows_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.deadline_changes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  task_id uuid,
  course_id uuid NOT NULL,
  title text NOT NULL,
  old_due_date timestamp with time zone,
  new_due_date timestamp with time zone NOT NULL,
  detected_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT deadline_changes_pkey PRIMARY KEY (id),
  CONSTRAINT deadline_changes_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.academic_tasks(id),
  CONSTRAINT deadline_changes_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.ai_requests (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  feature text NOT NULL,
  model text,
  latency_ms integer NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status = ANY (ARRAY['ok'::text, 'error'::text])),
  error text,
  prompt_tokens integer,
  completion_tokens integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  cache_hit boolean NOT NULL DEFAULT false,
  CONSTRAINT ai_requests_pkey PRIMARY KEY (id),
  CONSTRAINT ai_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.chat_threads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid,
  title text NOT NULL DEFAULT 'New chat'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  archived_at timestamp with time zone,
  CONSTRAINT chat_threads_pkey PRIMARY KEY (id),
  CONSTRAINT chat_threads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT chat_threads_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text])),
  content text NOT NULL,
  status text NOT NULL DEFAULT 'complete'::text CHECK (status = ANY (ARRAY['pending'::text, 'complete'::text, 'error'::text])),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.chat_threads(id)
);
CREATE TABLE public.sync_locks (
  user_id uuid NOT NULL,
  lock_token uuid NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  CONSTRAINT sync_locks_pkey PRIMARY KEY (user_id),
  CONSTRAINT sync_locks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.documents (
  id character varying NOT NULL,
  course_key character varying NOT NULL CHECK (length(course_key::text) > 0),
  course_id bigint NOT NULL CHECK (course_id > 0),
  module_id bigint CHECK (module_id IS NULL OR module_id > 0),
  owner_id character varying,
  source_fingerprint character varying,
  title character varying NOT NULL,
  source_type character varying NOT NULL CHECK (source_type::text = ANY (ARRAY['pdf'::character varying::text, 'html'::character varying::text, 'pptx'::character varying::text, 'spreadsheet'::character varying::text, 'word'::character varying::text, 'text'::character varying::text])),
  content text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT documents_pkey PRIMARY KEY (id)
);
CREATE TABLE public.chunks (
  id character varying NOT NULL,
  document_id character varying NOT NULL,
  course_key character varying NOT NULL CHECK (length(course_key::text) > 0),
  course_id bigint NOT NULL CHECK (course_id > 0),
  module_id bigint CHECK (module_id IS NULL OR module_id > 0),
  title character varying NOT NULL,
  source_type character varying NOT NULL CHECK (source_type::text = ANY (ARRAY['pdf'::character varying::text, 'html'::character varying::text, 'pptx'::character varying::text, 'spreadsheet'::character varying::text, 'word'::character varying::text, 'text'::character varying::text])),
  content text NOT NULL,
  chunk_index integer NOT NULL CHECK (chunk_index >= 0),
  embedding USER-DEFINED NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT chunks_pkey PRIMARY KEY (id),
  CONSTRAINT chunks_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id)
);
CREATE TABLE public.study_packs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  title text NOT NULL CHECK (length(title) >= 1 AND length(title) <= 200),
  mode text NOT NULL CHECK (mode = ANY (ARRAY['flashcards'::text, 'quiz'::text, 'mixed'::text])),
  topic text CHECK (topic IS NULL OR length(topic) <= 300),
  module text CHECK (module IS NULL OR length(module) <= 200),
  difficulty text NOT NULL CHECK (difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text, 'mixed'::text])),
  item_count integer NOT NULL CHECK (item_count >= 1 AND item_count <= 50),
  source_index_version text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  background_job_id uuid UNIQUE,
  CONSTRAINT study_packs_pkey PRIMARY KEY (id),
  CONSTRAINT study_packs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT study_packs_course_id_user_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT study_packs_course_id_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.courses(user_id),
  CONSTRAINT study_packs_background_job_id_fkey FOREIGN KEY (background_job_id) REFERENCES public.background_jobs(id)
);
CREATE TABLE public.study_pack_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pack_id uuid NOT NULL,
  item_order integer NOT NULL CHECK (item_order >= 0),
  item_type text NOT NULL CHECK (item_type = ANY (ARRAY['flashcard'::text, 'multiple_choice'::text, 'short_answer'::text])),
  question text NOT NULL CHECK (length(question) >= 1 AND length(question) <= 4000),
  answer text NOT NULL CHECK (length(answer) >= 1 AND length(answer) <= 4000),
  explanation text NOT NULL CHECK (length(explanation) >= 1 AND length(explanation) <= 4000),
  options jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(options) = 'array'::text),
  correct_option integer,
  citations jsonb NOT NULL CHECK (jsonb_typeof(citations) = 'array'::text AND jsonb_array_length(citations) > 0),
  difficulty text NOT NULL CHECK (difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])),
  CONSTRAINT study_pack_items_pkey PRIMARY KEY (id),
  CONSTRAINT study_pack_items_pack_id_fkey FOREIGN KEY (pack_id) REFERENCES public.study_packs(id)
);
CREATE TABLE public.study_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pack_id uuid NOT NULL,
  current_item integer NOT NULL DEFAULT 0 CHECK (current_item >= 0),
  status text NOT NULL DEFAULT 'in_progress'::text CHECK (status = ANY (ARRAY['in_progress'::text, 'paused'::text, 'completed'::text])),
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0),
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  last_active_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT study_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT study_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT study_sessions_pack_id_user_id_fkey FOREIGN KEY (pack_id) REFERENCES public.study_packs(id),
  CONSTRAINT study_sessions_pack_id_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.study_packs(user_id)
);
CREATE TABLE public.study_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  item_id uuid NOT NULL,
  answer text NOT NULL CHECK (length(answer) <= 4000),
  is_correct boolean NOT NULL,
  confidence integer CHECK (confidence >= 1 AND confidence <= 5),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT study_attempts_pkey PRIMARY KEY (id),
  CONSTRAINT study_attempts_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.study_sessions(id),
  CONSTRAINT study_attempts_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.study_pack_items(id)
);
CREATE TABLE public.course_modules (
  id bigint NOT NULL CHECK (id > 0),
  course_key character varying NOT NULL,
  owner_id character varying NOT NULL DEFAULT ''::character varying,
  name character varying NOT NULL,
  indexed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT course_modules_pkey PRIMARY KEY (id, course_key, owner_id)
);
CREATE TABLE public.deleted_account_ids (
  clerk_id_hash text NOT NULL,
  CONSTRAINT deleted_account_ids_pkey PRIMARY KEY (clerk_id_hash)
);
CREATE TABLE public.background_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind = ANY (ARRAY['onboarding'::text, 'sync'::text, 'course_sync'::text, 'study_prep'::text])),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text NOT NULL,
  status text NOT NULL DEFAULT 'queued'::text CHECK (status = ANY (ARRAY['queued'::text, 'running'::text, 'succeeded'::text, 'partial_failure'::text, 'failed'::text])),
  progress text NOT NULL DEFAULT 'Waiting for worker'::text,
  result jsonb,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamp with time zone NOT NULL DEFAULT now(),
  lease_token uuid,
  lease_until timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone,
  read_at timestamp with time zone,
  CONSTRAINT background_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT background_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.study_worker_heartbeats (
  worker_id uuid NOT NULL,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT study_worker_heartbeats_pkey PRIMARY KEY (worker_id)
);
CREATE TABLE public.study_generation_windows (
  user_id uuid NOT NULL,
  window_kind text NOT NULL CHECK (window_kind = ANY (ARRAY['minute'::text, 'day'::text])),
  window_start timestamp with time zone NOT NULL,
  count integer NOT NULL CHECK (count >= 0),
  CONSTRAINT study_generation_windows_pkey PRIMARY KEY (user_id, window_kind, window_start),
  CONSTRAINT study_generation_windows_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
