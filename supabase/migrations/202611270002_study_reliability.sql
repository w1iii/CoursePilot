-- Apply before deploying the matching web and app worker. Legacy workers may
-- continue syncing, but cannot claim study jobs using the new scope protocol.
create table public.study_worker_heartbeats (
  worker_id uuid primary key,
  last_seen_at timestamptz not null default now()
);
alter table public.study_worker_heartbeats enable row level security;
revoke all on public.study_worker_heartbeats from public, anon, authenticated;
grant select, insert, update, delete on public.study_worker_heartbeats to service_role;

create function public.report_study_worker_ready(p_worker_id uuid)
returns void language sql security definer set search_path = public as $$
  insert into study_worker_heartbeats(worker_id) values(p_worker_id)
  on conflict(worker_id) do update set last_seen_at = now();
$$;

create table public.study_generation_windows (
  user_id uuid not null references public.users(id) on delete cascade,
  window_kind text not null check (window_kind in ('minute', 'day')),
  window_start timestamptz not null,
  count integer not null check (count >= 0),
  primary key(user_id, window_kind, window_start)
);
alter table public.study_generation_windows enable row level security;
revoke all on public.study_generation_windows from public, anon, authenticated;
grant select, insert, update, delete on public.study_generation_windows to service_role;

-- Dedupe, capacity check, quota and publication share one transaction. Repeated
-- delivery of an active request does not charge quota again.
create function public.enqueue_study_prep_job(p_user_id uuid, p_payload jsonb, p_dedupe_key text)
returns table(job_id uuid, rejection text, retry_after_seconds integer)
language plpgsql security definer set search_path = public as $$
declare
  existing_id uuid;
  minute_start timestamptz := date_trunc('minute', now());
  day_start timestamptz := date_trunc('day', now());
begin
  perform 1 from users where id = p_user_id for update;
  if not found then raise exception 'User not found'; end if;
  if not exists(select 1 from courses where id = (p_payload->>'courseId')::uuid
    and user_id = p_user_id and selected_for_rag) then
    raise exception 'Selected course not found';
  end if;
  select id into existing_id from background_jobs where user_id = p_user_id
    and dedupe_key = p_dedupe_key and kind = 'study_prep' and status in ('queued','running');
  if existing_id is not null then
    return query select existing_id, null::text, 0;
    return;
  end if;
  if not exists(select 1 from study_worker_heartbeats where last_seen_at > now() - interval '90 seconds') then
    return query select null::uuid, 'worker_unavailable'::text, 10;
    return;
  end if;
  if coalesce((select count from study_generation_windows where user_id = p_user_id
    and window_kind = 'minute' and window_start = minute_start), 0) >= 5 then
    return query select null::uuid, 'limit'::text,
      greatest(1, ceil(extract(epoch from minute_start + interval '1 minute' - now()))::integer);
    return;
  end if;
  if coalesce((select count from study_generation_windows where user_id = p_user_id
    and window_kind = 'day' and window_start = day_start), 0) >= 40 then
    return query select null::uuid, 'limit'::text,
      greatest(1, ceil(extract(epoch from day_start + interval '1 day' - now()))::integer);
    return;
  end if;
  delete from study_generation_windows where user_id = p_user_id and window_start < now() - interval '2 days';
  delete from study_worker_heartbeats where last_seen_at < now() - interval '1 day';
  insert into study_generation_windows(user_id,window_kind,window_start,count)
    values(p_user_id,'minute',minute_start,1),(p_user_id,'day',day_start,1)
    on conflict(user_id,window_kind,window_start)
    do update set count = study_generation_windows.count + 1;
  existing_id := enqueue_background_job(p_user_id,'study_prep',p_payload,p_dedupe_key);
  update background_jobs set progress=case when exists(
    select 1 from background_jobs other where other.user_id=p_user_id and other.id<>existing_id
      and other.kind<>'study_prep' and other.status='running'
  ) then 'Waiting for current course sync' else 'Waiting for study worker' end
    where id=existing_id;
  return query select existing_id, null::text, 0;
end;
$$;

-- Default protocol 0 preserves old sync workers without letting them silently
-- turn moduleIds into whole-course generation. No ambiguous RPC overload.
drop function public.claim_background_job(uuid);
create function public.claim_background_job(p_token uuid, p_study_protocol integer default 0)
returns setof public.background_jobs language plpgsql security definer set search_path = public as $$
declare job_id uuid;
begin
  perform pg_advisory_xact_lock(721901);
  update background_jobs set status='failed', error='Worker interrupted repeatedly. Please retry.',
    progress='Failed', finished_at=now(), lease_token=null, lease_until=null
    where status='running' and lease_until < now() and attempts >= 3;
  select j.id into job_id from background_jobs j
  where ((j.status='queued' and j.available_at<=now()) or (j.status='running' and j.lease_until<now()))
    and j.attempts < 3
    and (j.kind <> 'study_prep' or p_study_protocol = 2)
    and not exists (select 1 from background_jobs other where other.user_id=j.user_id
      and other.id<>j.id and other.status='running' and other.lease_until>=now())
  order by j.created_at for update skip locked limit 1;
  return query update background_jobs set status='running', attempts=attempts+1,
    lease_token=p_token, lease_until=now()+interval '90 seconds', progress='Starting'
    where id=job_id returning *;
end;
$$;

-- One unfinished session per pack at creation time; retry lost HTTP responses
-- returns the same session. Pack lock serializes concurrent start requests.
create function public.start_study_session(p_user_id uuid, p_pack_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare result study_sessions;
begin
  perform 1 from study_packs where id = p_pack_id and user_id = p_user_id for update;
  if not found then return null; end if;
  if not exists(select 1 from study_pack_items where pack_id = p_pack_id) then
    raise exception 'Study pack is empty';
  end if;
  select * into result from study_sessions where user_id = p_user_id and pack_id = p_pack_id
    and status <> 'completed' order by last_active_at desc, id limit 1 for update;
  if not found then
    insert into study_sessions(user_id,pack_id) values(p_user_id,p_pack_id) returning * into result;
  else
    update study_sessions set status='in_progress', last_active_at=now()
      where id=result.id returning * into result;
  end if;
  return to_jsonb(result);
end;
$$;

-- All mutations lock the same session row: completion cannot race answer/score
-- writes. Completed sessions are immutable; replaying completion is idempotent.
create function public.save_study_attempt(p_user_id uuid, p_session_id uuid, p_item_id uuid,
  p_answer text, p_is_correct boolean, p_confidence integer default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  study study_sessions;
  item study_pack_items;
  result study_attempts;
  correct boolean;
begin
  select * into study from study_sessions where id = p_session_id and user_id = p_user_id for update;
  if not found or study.status = 'completed' then return null; end if;
  select * into item from study_pack_items where id = p_item_id and pack_id = study.pack_id;
  if not found then return null; end if;
  correct := case when item.item_type = 'multiple_choice'
    then (item.options->>item.correct_option) = p_answer else p_is_correct end;
  insert into study_attempts(session_id,item_id,answer,is_correct,confidence)
    values(p_session_id,p_item_id,p_answer,coalesce(correct,false),p_confidence)
    on conflict(session_id,item_id) do update set
      answer=excluded.answer, is_correct=excluded.is_correct, confidence=excluded.confidence
    returning * into result;
  update study_sessions set score=(select count(*) from study_attempts where session_id=p_session_id and is_correct),
    last_active_at=now() where id=p_session_id;
  return to_jsonb(result);
end;
$$;

create function public.update_study_session(p_user_id uuid, p_session_id uuid,
  p_current_item integer default null, p_status text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare study study_sessions; item_total integer; next_item integer;
begin
  select * into study from study_sessions where id=p_session_id and user_id=p_user_id for update;
  if not found then return null; end if;
  if study.status='completed' then
    if p_status='completed' and (p_current_item is null or p_current_item=study.current_item) then
      return to_jsonb(study);
    end if;
    return null;
  end if;
  select count(*) into item_total from study_pack_items where pack_id=study.pack_id;
  next_item := coalesce(p_current_item, study.current_item);
  if item_total = 0 or next_item < 0 or next_item > item_total
    or (coalesce(p_status,study.status)<>'completed' and next_item>=item_total)
    or (p_status='completed' and next_item<>item_total)
    or (p_status is not null and p_status not in ('in_progress','paused','completed')) then
    raise exception 'Invalid study progress' using errcode = '22023';
  end if;
  -- Advancing past an item requires a persisted attempt, not merely revealing
  -- its answer. This also blocks direct API calls skipping unanswered items.
  if exists(select 1 from study_pack_items item where item.pack_id=study.pack_id
    and item.item_order < next_item and not exists(
      select 1 from study_attempts attempt where attempt.session_id=p_session_id and attempt.item_id=item.id
    )) then
    raise exception 'Answer each question before continuing' using errcode = '22023';
  end if;
  update study_sessions set current_item=next_item, status=coalesce(p_status,status),
    completed_at=case when p_status='completed' then now() else completed_at end,
    score=(select count(*) from study_attempts where session_id=p_session_id and is_correct),
    last_active_at=now() where id=p_session_id returning * into study;
  return to_jsonb(study);
end;
$$;

revoke all on function public.report_study_worker_ready(uuid),
  public.enqueue_study_prep_job(uuid,jsonb,text), public.claim_background_job(uuid,integer),
  public.start_study_session(uuid,uuid), public.save_study_attempt(uuid,uuid,uuid,text,boolean,integer),
  public.update_study_session(uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.report_study_worker_ready(uuid),
  public.enqueue_study_prep_job(uuid,jsonb,text), public.claim_background_job(uuid,integer),
  public.start_study_session(uuid,uuid), public.save_study_attempt(uuid,uuid,uuid,text,boolean,integer),
  public.update_study_session(uuid,uuid,integer,text) to service_role;

notify pgrst, 'reload schema';
