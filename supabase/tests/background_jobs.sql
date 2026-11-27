-- Run after schema.sql, study-prep migration, and background-jobs migration.
-- Uses only synthetic data and rolls back all changes.
begin;
do $$
declare
  u uuid; c uuid; j uuid; j2 uuid; pack uuid;
  token uuid := gen_random_uuid(); claimed background_jobs; n integer;
begin
  assert not has_function_privilege('anon','enqueue_background_job(uuid,text,jsonb,text)','execute'), 'anon can enqueue';
  assert not has_function_privilege('authenticated','enqueue_background_job(uuid,text,jsonb,text)','execute'), 'client can enqueue';
  assert has_function_privilege('service_role','enqueue_background_job(uuid,text,jsonb,text)','execute'), 'worker cannot enqueue';
  insert into users(clerk_user_id,email) values('queue-test','queue@example.test') returning id into u;
  insert into courses(user_id,canvas_course_id,course_name) values(u,1,'Queue course') returning id into c;
  j := finish_onboarding_queued(u,array[c]);
  assert (select onboarding_completed_at is not null from users where id=u), 'onboarding gate not saved';
  assert (select selected_for_rag from courses where id=c), 'selection not saved';
  assert enqueue_background_job(u,'sync','{}','sync') = j, 'active dedupe failed';
  select * into claimed from claim_background_job(token);
  assert claimed.id=j and claimed.attempts=1, 'claim failed';
  assert not heartbeat_background_job(j,gen_random_uuid(),'wrong'), 'foreign lease accepted';
  assert heartbeat_background_job(j,token,'Indexing'), 'heartbeat failed';
  j2 := enqueue_background_job(u,'study_prep',
    jsonb_build_object('courseId',c,'moduleIds',jsonb_build_array(1,2),'topic','key terms'),'study-test');
  assert (select payload->'moduleIds'='[1,2]'::jsonb from background_jobs where id=j2), 'module selection lost';
  select count(*) into n from claim_background_job(gen_random_uuid());
  assert n=0, 'same user ran concurrent jobs';
  assert finish_background_job(j,token,'partial_failure','{}','One course failed'), 'completion failed';
  assert (select read_at is null and status='partial_failure' from background_jobs where id=j), 'notification missing';
  token := gen_random_uuid();
  select * into claimed from claim_background_job(token);
  assert claimed.id=j2, 'next job did not start';
  pack := save_background_study_pack(j2,token,
    jsonb_build_object('course_id',c,'title','Test pack','mode','flashcards','difficulty','easy','source_index_version','v1',
      'module','Cells, Plants','topic','key terms'),
    '[{"item_type":"flashcard","question":"Q","answer":"A","explanation":"E","difficulty":"easy","citations":[{"id":"source"}]}]');
  assert save_background_study_pack(j2,token,'{}','[]')=pack, 'pack insert not idempotent';
  assert (select count(*)=1 from study_pack_items where pack_id=pack), 'items missing';
  assert (select module='Cells, Plants' and topic='key terms' from study_packs where id=pack), 'study scope lost';
  update background_jobs set lease_until=now()-interval '1 second',attempts=3 where id=j2;
  perform claim_background_job(gen_random_uuid());
  assert (select status='failed' and read_at is null from background_jobs where id=j2), 'crash failure not notified';
  assert not finish_background_job(j2,token,'succeeded','{}',null), 'stale worker completed';
end;
$$;
rollback;
