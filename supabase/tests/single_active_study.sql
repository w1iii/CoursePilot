begin;
do $$
declare u uuid; c uuid; first_job uuid; next_job uuid; result record; payload jsonb;
begin
  assert not has_function_privilege('anon','enqueue_study_prep_job(uuid,jsonb,text)','execute');
  assert not has_function_privilege('authenticated','enqueue_study_prep_job_with_quota(uuid,jsonb,text)','execute');
  insert into users(clerk_user_id,email) values('single-study','single@example.test') returning id into u;
  insert into courses(user_id,canvas_course_id,course_name,selected_for_rag)
    values(u,1,'Single study',true) returning id into c;
  perform report_study_worker_ready(gen_random_uuid());
  payload := jsonb_build_object('courseId',c,'moduleIds','[1]'::jsonb);
  select * into result from enqueue_study_prep_job(u,payload,'single:one');
  first_job := result.job_id;
  assert first_job is not null and result.rejection is null;
  select * into result from enqueue_study_prep_job(u,payload||'{"moduleIds":[2]}'::jsonb,'single:two');
  assert result.job_id=first_job and result.rejection='busy', 'different scope queued a second job';
  assert (select count=1 from study_generation_windows where user_id=u and window_kind='day'), 'busy request charged quota';
  assert enqueue_background_job(u,'study_prep',payload,'legacy:different')=first_job, 'legacy enqueue bypassed guard';
  assert (select count(*)=1 from background_jobs where user_id=u and kind='study_prep');
  assert enqueue_background_job(u,'sync','{}','sync')<>first_job, 'study lock blocked course sync publication';
  update background_jobs set status='failed' where id=first_job;
  select * into result from enqueue_study_prep_job(u,payload,'single:three');
  next_job := result.job_id;
  assert next_job<>first_job and result.rejection is null, 'failure did not unlock generation';
  update background_jobs set status='running' where id=next_job;
  select * into result from enqueue_study_prep_job(u,payload,'single:four');
  assert result.job_id=next_job and result.rejection='busy', 'running study did not block submission';
  update background_jobs set status='succeeded' where id=next_job;
  select * into result from enqueue_study_prep_job(u,payload,'single:five');
  assert result.job_id<>next_job and result.rejection is null, 'success did not unlock generation';
end;
$$;
rollback;
