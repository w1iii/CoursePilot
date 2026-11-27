-- One active study generation per user, including different courses/scopes.
-- Leave already-queued jobs intact; never cancel existing user work on upgrade.
create or replace function public.enqueue_background_job(p_user_id uuid, p_kind text, p_payload jsonb, p_dedupe_key text)
returns uuid language plpgsql security definer set search_path = public as $$
declare job_id uuid;
begin
  if p_kind = 'study_prep' then
    perform 1 from users where id=p_user_id for update;
    if not found then raise exception 'User not found'; end if;
    select id into job_id from background_jobs where user_id=p_user_id
      and kind='study_prep' and status in ('queued','running') order by created_at,id limit 1;
    if job_id is not null then return job_id; end if;
  end if;
  insert into background_jobs(user_id,kind,payload,dedupe_key)
    values(p_user_id,p_kind,p_payload,p_dedupe_key)
    on conflict (user_id,dedupe_key) where status in ('queued','running')
    do update set dedupe_key=excluded.dedupe_key returning id into job_id;
  return job_id;
end;
$$;

-- Keep the validated quota/readiness implementation, with a serialized guard
-- before it. Renaming retains the original service-role-only grants.
alter function public.enqueue_study_prep_job(uuid,jsonb,text) rename to enqueue_study_prep_job_with_quota;
create function public.enqueue_study_prep_job(p_user_id uuid, p_payload jsonb, p_dedupe_key text)
returns table(job_id uuid, rejection text, retry_after_seconds integer)
language plpgsql security definer set search_path = public as $$
declare existing_id uuid;
begin
  perform 1 from users where id=p_user_id for update;
  if not found then raise exception 'User not found'; end if;
  select id into existing_id from background_jobs where user_id=p_user_id
    and kind='study_prep' and status in ('queued','running') order by created_at,id limit 1;
  if existing_id is not null then
    return query select existing_id, 'busy'::text, 0;
    return;
  end if;
  return query select * from enqueue_study_prep_job_with_quota(p_user_id,p_payload,p_dedupe_key);
end;
$$;
revoke all on function public.enqueue_background_job(uuid,text,jsonb,text),
  public.enqueue_study_prep_job(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.enqueue_background_job(uuid,text,jsonb,text),
  public.enqueue_study_prep_job(uuid,jsonb,text) to service_role;
notify pgrst, 'reload schema';
