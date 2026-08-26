-- transactions/expense_details still carry the raw `select, insert` grant
-- to `authenticated` from 00010/00013, unlike accounts (tightened in
-- 00034/00043) — the same audit gap, just never closed here. All real
-- writes to these tables already go exclusively through
-- create_account_with_transaction/top_up_account/transfer_between_accounts
-- /create_expense, all `security definer`, which execute with the
-- function owner's privileges regardless of these grants (confirmed no
-- client code ever calls supabase.from("transactions"|"expense_details").
-- insert/update/upsert(...) — only the local Dexie tables of the same
-- name are ever mutated directly).
--
-- `select` is deliberately NOT revoked here, unlike accounts' 00034: both
-- pullAccounts() (src/lib/local/accounts.ts) and the expense pull path
-- (src/lib/local/expenses.ts) do a direct PostgREST select against these
-- tables as the signed-in user for incremental sync — revoking select
-- would break that outright. Existing RLS select policies already scope
-- each user to their own rows.
revoke insert on public.transactions from authenticated;
revoke insert on public.expense_details from authenticated;
