-- Synthetic data only; all changes rolled back.
begin;
do $$
declare
  u uuid; other_user uuid; c uuid; pack uuid; item uuid; study_session_id uuid; new_session uuid;
  result jsonb; queued record; job uuid; claimed background_jobs; i integer; token uuid := gen_random_uuid();
  payload jsonb;
begin
  assert not has_function_privilege('anon','enqueue_study_prep_job(uuid,jsonb,text)','execute');
  assert not has_function_privilege('authenticated','save_study_attempt(uuid,uuid,uuid,text,boolean,integer)','execute');
  assert not has_function_privilege('authenticated','start_study_session(uuid,uuid)','execute');
  assert not has_function_privilege('anon','update_study_session(uuid,uuid,integer,text)','execute');
  assert has_function_privilege('service_role','claim_background_job(uuid,integer)','execute');
  assert not has_table_privilege('authenticated','study_generation_windows','select');
  insert into users(clerk_user_id,email) values('study-test','study@example.test') returning id into u;
  insert into users(clerk_user_id,email) values('study-other','other@example.test') returning id into other_user;
  insert into courses(user_id,canvas_course_id,course_name,selected_for_rag) values(u,1,'Study course',true) returning id into c;
  payload := jsonb_build_object('courseId',c,'moduleIds','[1,2]'::jsonb,'count',1,'mode','quiz','difficulty','easy');

  select * into queued from enqueue_study_prep_job(u,payload,'study:one');
  assert queued.rejection='worker_unavailable' and queued.job_id is null;
  assert (select count(*)=0 from study_generation_windows where user_id=u), 'unavailable worker charged quota';
  perform report_study_worker_ready(gen_random_uuid());
  -- Chat traffic must not consume study-generation quota.
  for i in 1..45 loop perform check_rate_limit(u,100,200); end loop;
  select * into queued from enqueue_study_prep_job(u,payload,'study:one');
  assert queued.rejection is null and queued.job_id is not null, 'chat consumed study quota';
  job := queued.job_id;
  select * into queued from enqueue_study_prep_job(u,payload,'study:one');
  assert queued.job_id=job, 'dedupe did not reuse active job';
  assert (select count=1 from study_generation_windows where user_id=u and window_kind='day'), 'dedupe charged quota';
  select * into claimed from claim_background_job(token);
  assert claimed.id is null, 'legacy worker claimed module-scoped job';
  select * into claimed from claim_background_job(token,2);
  assert claimed.id=job, 'compatible worker could not claim job';
  assert finish_background_job(job,token,'succeeded','{}',null);

  for i in 2..5 loop
    select * into queued from enqueue_study_prep_job(u,payload,'study:'||i);
    assert queued.job_id is not null;
  end loop;
  select * into queued from enqueue_study_prep_job(u,payload,'study:six');
  assert queued.rejection='limit' and queued.retry_after_seconds>0;
  assert (select count=5 from study_generation_windows where user_id=u and window_kind='day'), 'denied request charged quota';
  update study_generation_windows set count=0 where user_id=u and window_kind='minute';
  update study_generation_windows set count=40 where user_id=u and window_kind='day';
  select * into queued from enqueue_study_prep_job(u,payload,'study:daily');
  assert queued.rejection='limit' and queued.retry_after_seconds>0, 'daily limit ignored';
  -- Existing work remains accessible even after quota is exhausted.
  select * into queued from enqueue_study_prep_job(u,payload,'study:2');
  assert queued.job_id is not null and queued.rejection is null;

  insert into study_packs(user_id,course_id,title,mode,difficulty,item_count,source_index_version)
    values(u,c,'Test pack','quiz','easy',1,'test') returning id into pack;
  begin
    perform start_study_session(u,pack);
    raise exception 'empty pack accepted';
  exception when raise_exception then
    if sqlerrm <> 'Study pack is empty' then raise; end if;
  end;
  insert into study_pack_items(pack_id,item_order,item_type,question,answer,explanation,options,correct_option,citations,difficulty)
    values(pack,0,'multiple_choice','Q','Correct','E','["Correct","Wrong","Third","Fourth"]',0,'[{"id":"source"}]','easy')
    returning id into item;
  result := start_study_session(u,pack);
  study_session_id := (result->>'id')::uuid;
  assert (start_study_session(u,pack)->>'id')::uuid=study_session_id, 'session retry duplicated';
  assert start_study_session(other_user,pack) is null, 'foreign pack accepted';
  assert save_study_attempt(other_user,study_session_id,item,'Correct',true) is null, 'foreign answer accepted';
  assert save_study_attempt(u,study_session_id,gen_random_uuid(),'Correct',true) is null, 'foreign item accepted';
  assert update_study_session(other_user,study_session_id,0,'paused') is null, 'foreign progress accepted';
  begin
    perform update_study_session(u,study_session_id,1000,'in_progress');
    raise exception 'out of range accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform update_study_session(u,study_session_id,1,'completed');
    raise exception 'unanswered completion accepted';
  exception when invalid_parameter_value then null;
  end;
  result := save_study_attempt(u,study_session_id,item,'Wrong',true);
  assert result->>'is_correct'='false', 'client correctness trusted for quiz';
  assert (select score=0 from study_sessions where id=study_session_id);
  result := save_study_attempt(u,study_session_id,item,'Correct',false);
  assert result->>'is_correct'='true', 'server grading incorrect';
  assert (select count(*)=1 from study_attempts where session_id=study_session_id), 'answer retry duplicated';
  assert (select score=1 from study_sessions where id=study_session_id);
  result := update_study_session(u,study_session_id,0,'paused');
  assert result->>'status'='paused';
  assert (start_study_session(u,pack)->>'id')::uuid=study_session_id, 'paused session not reused';
  result := update_study_session(u,study_session_id,1,'completed');
  assert result->>'score'='1' and result->>'status'='completed';
  assert update_study_session(u,study_session_id,1,'completed')=result, 'completion retry not idempotent';
  assert save_study_attempt(u,study_session_id,item,'Wrong',false) is null, 'completed answer mutated';
  assert update_study_session(u,study_session_id,0,'paused') is null, 'completed session reopened';
  new_session := (start_study_session(u,pack)->>'id')::uuid;
  assert new_session<>study_session_id, 'cannot study pack again after completion';
end;
$$;
rollback;
