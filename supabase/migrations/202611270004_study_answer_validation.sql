-- Validate type-specific input inside the existing owner-fenced transaction.
create or replace function public.save_study_attempt(p_user_id uuid, p_session_id uuid, p_item_id uuid,
  p_answer text, p_is_correct boolean, p_confidence integer default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare study study_sessions; item study_pack_items; result study_attempts; correct boolean;
begin
  select * into study from study_sessions where id=p_session_id and user_id=p_user_id for update;
  if not found or study.status='completed' then return null; end if;
  select * into item from study_pack_items where id=p_item_id and pack_id=study.pack_id;
  if not found then return null; end if;
  if p_answer is null or length(p_answer)>4000 or p_is_correct is null
    or (p_confidence is not null and p_confidence not between 1 and 5)
    or translate(p_answer,E'\n\r\t','') ~ '[[:cntrl:]]'
    or p_answer ~ U&'[\202A-\202E]' then
    raise exception 'Invalid answer text' using errcode='22023';
  end if;
  if item.item_type='short_answer' and p_answer !~ U&'[^[:space:]\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]' then
    raise exception 'Written answer must not be blank' using errcode='22023';
  end if;
  if item.item_type='multiple_choice' and not exists(
    select 1 from jsonb_array_elements_text(item.options) as choices(value) where choices.value=p_answer
  ) then
    raise exception 'Choose one of the listed options' using errcode='22023';
  end if;
  correct := case when item.item_type='multiple_choice'
    then (item.options->>item.correct_option)=p_answer else p_is_correct end;
  insert into study_attempts(session_id,item_id,answer,is_correct,confidence)
    values(p_session_id,p_item_id,p_answer,coalesce(correct,false),p_confidence)
    on conflict(session_id,item_id) do update set
      answer=excluded.answer,is_correct=excluded.is_correct,confidence=excluded.confidence
    returning * into result;
  update study_sessions set score=(select count(*) from study_attempts where session_id=p_session_id and is_correct),
    last_active_at=now() where id=p_session_id;
  return to_jsonb(result);
end;
$$;
revoke all on function public.save_study_attempt(uuid,uuid,uuid,text,boolean,integer) from public,anon,authenticated;
grant execute on function public.save_study_attempt(uuid,uuid,uuid,text,boolean,integer) to service_role;
notify pgrst,'reload schema';
