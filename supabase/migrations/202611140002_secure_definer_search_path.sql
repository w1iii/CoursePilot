begin;

alter function public.save_chat_thread(uuid, uuid, uuid, text, jsonb)
  set search_path = '';
alter function public.check_rate_limit(uuid, integer, integer)
  set search_path = '';
alter function public.get_rate_limit_usage(uuid)
  set search_path = '';

revoke all on function public.save_chat_thread(uuid, uuid, uuid, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.check_rate_limit(uuid, integer, integer)
  from public, anon, authenticated;
revoke all on function public.get_rate_limit_usage(uuid)
  from public, anon, authenticated;

grant execute on function public.save_chat_thread(uuid, uuid, uuid, text, jsonb)
  to service_role;
grant execute on function public.check_rate_limit(uuid, integer, integer)
  to service_role;
grant execute on function public.get_rate_limit_usage(uuid)
  to service_role;

commit;
