-- accounts.balance: superseded by folding transactions (00049's
-- consistency check and 00051's RPC changes must both already be applied
-- and verified before this file runs — nothing writes this column
-- anymore, and every read of "the balance" now comes from folding
-- transactions, server- and client-side).
-- accounts.type: dead since 00001_initial_schema.sql — never read or
-- written by any app code (create_account_with_transaction never took a
-- type param; no client code references it).
--
-- Deploy ordering: do not push this file until the frontend build that
-- stops selecting accounts.balance (src/lib/local/accounts.ts's
-- pullAccounts, src/lib/stores/accounts.ts's Realtime handler) is
-- confirmed live. Every other migration in this restructuring is
-- backward-compatible with the currently-live frontend; this one is not.
alter table public.accounts drop column balance;
alter table public.accounts drop column type;
