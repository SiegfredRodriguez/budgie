alter table public.accounts replica identity full;
alter publication supabase_realtime add table public.accounts;
