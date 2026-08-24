-- Every account-balance mutation happens server-side, through the edge
-- functions' RPC calls (create_account_with_transaction, top_up_account,
-- transfer_between_accounts), which run as the service role and bypass
-- these grants entirely. Nothing in the client ever inserts or updates
-- `accounts` directly (confirmed: only a select and a delete). The
-- pre-existing `insert`/`update` grants to `authenticated` therefore serve
-- no feature, and would otherwise let a signed-in user PATCH their own
-- account's balance straight over PostgREST — skipping the ledger RPCs and
-- leaving no transaction record behind. Revoke both.
revoke insert, update on public.accounts from authenticated;

-- Left over from before row-level security existed on this table (see
-- 00003_anon_permissions.sql, 00005_grant_delete_anon.sql). RLS has denied
-- `anon` by default since 00010_enable_rls.sql, so these are inert today,
-- but a stale grant is a live risk the moment a policy changes.
revoke select, delete on public.accounts from anon;
