-- Sync leases are accessed by service-role-only SECURITY DEFINER functions.
alter table public.sync_locks enable row level security;
