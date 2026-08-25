-- `payees_tags` was never added to the realtime publication (00025 added
-- RLS policies for it but forgot the publication line) — confirmed via a
-- raw Realtime client test that its postgres_changes events never arrive
-- at all, regardless of channel setup. Adding it now, plus the equivalent
-- tables the accounts/expenses phases of the local-first rollout will need
-- next (transactions, expense_details, expenses_tags), so the same gap
-- doesn't resurface there.
alter publication supabase_realtime add table public.payees_tags;
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.expense_details;
alter publication supabase_realtime add table public.expenses_tags;
