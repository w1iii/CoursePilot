alter table public.users
  add column if not exists onboarding_completed_at timestamptz;

alter table public.courses
  add column if not exists selected_for_rag boolean not null default false;

update public.courses
set selected_for_rag = true
where rag_indexed_at is not null;

-- Preserve access for existing Canvas-connected users; new accounts complete onboarding.
update public.users u
set onboarding_completed_at = coalesce(u.onboarding_completed_at, now())
where exists (
  select 1 from public.canvas_accounts ca where ca.user_id = u.id
);
