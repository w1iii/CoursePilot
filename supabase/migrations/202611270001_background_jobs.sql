-- Service-role-only durable queue. Terminal jobs double as persistent notifications.
create function public.renew_sync_lock(p_user_id uuid,p_lock_token uuid,p_lease_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update sync_locks set expires_at=now()+make_interval(secs=>p_lease_seconds)
    where user_id=p_user_id and lock_token=p_lock_token and expires_at>now();
  return found;
end;
$$;
revoke all on function public.renew_sync_lock(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.renew_sync_lock(uuid,uuid,integer) to service_role;

create table public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('onboarding', 'sync', 'course_sync', 'study_prep')),
  payload jsonb not null default '{}',
  dedupe_key text not null,
  status text not null default 'queued' check (status in ('queued','running','succeeded','partial_failure','failed')),
  progress text not null default 'Waiting for worker',
  result jsonb,
  error text,
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  read_at timestamptz
);
alter table public.background_jobs enable row level security;
revoke all on public.background_jobs from public,anon,authenticated;
grant select,insert,update,delete on public.background_jobs to service_role;
create unique index background_jobs_active_dedupe on public.background_jobs(user_id, dedupe_key)
  where status in ('queued','running');
create index background_jobs_claim on public.background_jobs(available_at, created_at)
  where status in ('queued','running');
create index background_jobs_user on public.background_jobs(user_id, created_at desc);

create function public.enqueue_background_job(p_user_id uuid, p_kind text, p_payload jsonb, p_dedupe_key text)
returns uuid language plpgsql security definer set search_path = public as $$
declare job_id uuid;
begin
  insert into background_jobs(user_id,kind,payload,dedupe_key)
  values(p_user_id,p_kind,p_payload,p_dedupe_key)
  on conflict (user_id,dedupe_key) where status in ('queued','running')
  do update set dedupe_key = excluded.dedupe_key returning id into job_id;
  return job_id;
end;
$$;

-- Selection, onboarding gate, and queue publication must succeed together.
create function public.finish_onboarding_queued(p_user_id uuid, p_course_ids uuid[])
returns uuid language plpgsql security definer set search_path = public as $$
declare job_id uuid;
begin
  perform 1 from users where id = p_user_id for update;
  if cardinality(p_course_ids) = 0 or exists (
    select 1 from unnest(p_course_ids) selected(id)
    where not exists (select 1 from courses where courses.id = selected.id and user_id = p_user_id)
  ) then raise exception 'Invalid selection'; end if;
  update courses set selected_for_rag = (id = any(p_course_ids)) where user_id = p_user_id;
  job_id := enqueue_background_job(p_user_id,'onboarding','{}','sync');
  update users set onboarding_completed_at = coalesce(onboarding_completed_at,now()) where id = p_user_id;
  return job_id;
end;
$$;

create function public.claim_background_job(p_token uuid)
returns setof public.background_jobs language plpgsql security definer set search_path = public as $$
declare job_id uuid;
begin
  perform pg_advisory_xact_lock(721901);
  -- Expired final attempts become visible failure notifications.
  update background_jobs set status='failed', error='Worker interrupted repeatedly. Please retry.',
    progress='Failed', finished_at=now(), lease_token=null, lease_until=null
    where status='running' and lease_until < now() and attempts >= 3;
  -- Serialize claims; only one job per user may execute at once.
  select j.id into job_id from background_jobs j
  where ((j.status='queued' and j.available_at<=now()) or (j.status='running' and j.lease_until<now()))
    and j.attempts < 3
    and not exists (select 1 from background_jobs other where other.user_id=j.user_id
      and other.id<>j.id and other.status='running' and other.lease_until>=now())
  order by j.created_at for update skip locked limit 1;
  return query update background_jobs set status='running', attempts=attempts+1,
    lease_token=p_token, lease_until=now()+interval '90 seconds', progress='Starting'
    where id=job_id returning *;
end;
$$;

create function public.heartbeat_background_job(p_id uuid,p_token uuid,p_progress text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update background_jobs set lease_until=now()+interval '90 seconds', progress=p_progress
    where id=p_id and status='running' and lease_token=p_token and lease_until>now();
  return found;
end;
$$;

create function public.finish_background_job(p_id uuid,p_token uuid,p_status text,p_result jsonb,p_error text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('succeeded','partial_failure','failed','queued') then raise exception 'Invalid status'; end if;
  update background_jobs set status=p_status,result=p_result,error=p_error,
    progress=case when p_status='queued' then 'Retrying shortly' else 'Finished' end,
    available_at=now()+interval '30 seconds',
    finished_at=case when p_status='queued' then null else now() end,
    lease_token=null,lease_until=null
    where id=p_id and status='running' and lease_token=p_token and lease_until>now();
  return found;
end;
$$;

-- Commit generated pack, items, and result atomically and fence stale workers.
alter table public.study_packs add column background_job_id uuid unique
  references public.background_jobs(id) on delete set null;
create function public.save_background_study_pack(p_job_id uuid,p_token uuid,p_pack jsonb,p_items jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare job background_jobs; pack_id uuid;
begin
  select * into job from background_jobs where id=p_job_id for update;
  if not found or job.kind<>'study_prep' or job.status<>'running' or job.lease_token is distinct from p_token or job.lease_until<=now()
    then raise exception 'Job lease lost'; end if;
  select id into pack_id from study_packs where background_job_id=p_job_id;
  if pack_id is not null then return pack_id; end if;
  insert into study_packs(user_id,course_id,title,mode,topic,module,difficulty,item_count,source_index_version,background_job_id)
    values(job.user_id,(p_pack->>'course_id')::uuid,p_pack->>'title',p_pack->>'mode',
      p_pack->>'topic',p_pack->>'module',p_pack->>'difficulty',jsonb_array_length(p_items),
      p_pack->>'source_index_version',p_job_id) returning id into pack_id;
  insert into study_pack_items(pack_id,item_order,item_type,question,answer,explanation,options,correct_option,citations,difficulty)
    select pack_id,(ordinality-1)::integer,item->>'item_type',item->>'question',item->>'answer',
      item->>'explanation',coalesce(item->'options','[]'::jsonb),(item->>'correct_option')::integer,item->'citations',item->>'difficulty'
    from jsonb_array_elements(p_items) with ordinality as items(item,ordinality);
  return pack_id;
end;
$$;

revoke all on function public.enqueue_background_job(uuid,text,jsonb,text),
  public.finish_onboarding_queued(uuid,uuid[]), public.claim_background_job(uuid),
  public.heartbeat_background_job(uuid,uuid,text),
  public.finish_background_job(uuid,uuid,text,jsonb,text),
  public.save_background_study_pack(uuid,uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.enqueue_background_job(uuid,text,jsonb,text),
  public.finish_onboarding_queued(uuid,uuid[]), public.claim_background_job(uuid),
  public.heartbeat_background_job(uuid,uuid,text),
  public.finish_background_job(uuid,uuid,text,jsonb,text),
  public.save_background_study_pack(uuid,uuid,jsonb,jsonb) to service_role;
