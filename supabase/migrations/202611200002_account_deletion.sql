-- Tombstones prevent an in-flight request from recreating a deleted account.
create table if not exists public.deleted_account_ids (
  clerk_id_hash text primary key
);
alter table public.deleted_account_ids enable row level security;
revoke all on public.deleted_account_ids from public, anon, authenticated;
grant select, insert on public.deleted_account_ids to service_role;

create or replace function public.guard_deleted_account() returns trigger
language plpgsql set search_path = '' as $$
declare account_hash text := encode(sha256(convert_to(new.clerk_user_id, 'UTF8')), 'hex');
begin
  perform pg_advisory_xact_lock(hashtextextended(account_hash, 0));
  if exists (select 1 from public.deleted_account_ids where clerk_id_hash = account_hash) then
    raise exception 'Account has been deleted';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_deleted_account on public.users;
create trigger guard_deleted_account before insert or update on public.users
for each row execute function public.guard_deleted_account();

create or replace function public.delete_account_data(p_clerk_user_id text) returns void
language plpgsql set search_path = '' as $$
declare account_hash text := encode(sha256(convert_to(p_clerk_user_id, 'UTF8')), 'hex');
begin
  perform pg_advisory_xact_lock(hashtextextended(account_hash, 0));
  insert into public.deleted_account_ids (clerk_id_hash) values (account_hash) on conflict do nothing;
  delete from public.ai_requests where user_id in (select id from public.users where clerk_user_id = p_clerk_user_id);
  delete from public.users where clerk_user_id = p_clerk_user_id;
end;
$$;
revoke all on function public.delete_account_data(text) from public, anon, authenticated;
grant execute on function public.delete_account_data(text) to service_role;
