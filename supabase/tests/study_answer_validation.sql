begin;
do $$
declare u uuid; c uuid; pack uuid; sid uuid; written uuid; choice uuid; card uuid; result jsonb; value text;
begin
  insert into users(clerk_user_id,email) values('answer-validation','answer@example.test') returning id into u;
  insert into courses(user_id,canvas_course_id,course_name) values(u,1,'Answers') returning id into c;
  insert into study_packs(user_id,course_id,title,mode,difficulty,item_count,source_index_version)
    values(u,c,'Answers','mixed','easy',3,'test') returning id into pack;
  insert into study_pack_items(pack_id,item_order,item_type,question,answer,explanation,citations,difficulty)
    values(pack,0,'short_answer','Q','A','E','[{"id":"source"}]','easy') returning id into written;
  insert into study_pack_items(pack_id,item_order,item_type,question,answer,explanation,options,correct_option,citations,difficulty)
    values(pack,1,'multiple_choice','Q','A','E','["A","B","C","D"]',0,'[{"id":"source"}]','easy') returning id into choice;
  insert into study_pack_items(pack_id,item_order,item_type,question,answer,explanation,citations,difficulty)
    values(pack,2,'flashcard','Q','A','E','[{"id":"source"}]','easy') returning id into card;
  sid := (start_study_session(u,pack)->>'id')::uuid;
  foreach value in array array['',E' \t\n',U&'\00A0\2003',E'bad\001text',U&'answer\202E'] loop
    begin
      perform save_study_attempt(u,sid,written,value,true);
      raise exception 'Invalid written answer accepted';
    exception when invalid_parameter_value then null;
    end;
  end loop;
  begin
    perform save_study_attempt(u,sid,choice,'Not an option',true);
    raise exception 'Invented option accepted';
  exception when invalid_parameter_value then null;
  end;
  assert (select count(*)=0 from study_attempts where session_id=sid), 'Invalid inputs persisted';
  result := save_study_attempt(u,sid,written,U&'\5149\5408\4F5C\7528',true);
  assert result->>'is_correct'='true', 'Multilingual answer rejected';
  result := save_study_attempt(u,sid,choice,'B',true);
  assert result->>'is_correct'='false', 'Quiz trusted client correctness';
  result := save_study_attempt(u,sid,card,'',true);
  assert result->>'is_correct'='true', 'Flashcard self-grading broken';
  assert (select score=2 from study_sessions where id=sid), 'Score transaction broken';
  assert not has_function_privilege('authenticated','save_study_attempt(uuid,uuid,uuid,text,boolean,integer)','execute');
end;
$$;
rollback;
