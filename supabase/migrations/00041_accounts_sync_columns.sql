-- Same sync scaffolding as tags/payees (see 00036/00038): last_modified is
-- server-stamped (never client-trusted) and is the incremental-pull
-- watermark; is_deleted turns account deletion into a soft-delete tombstone
-- so a pull picks it up like any other change.
--
-- Note: this repeats work briefly done and reverted in 00030/00031/00032
-- (a prior abandoned attempt on the fat-client branch) — those added the
-- same columns via ad-hoc, untracked functions. This migration is the real,
-- reviewed version, and no code from that attempt is reused.
alter table public.accounts
	add column last_modified timestamptz not null default now(),
	add column is_deleted boolean not null default false;

create trigger accounts_set_last_modified
	before insert or update on public.accounts
	for each row execute function public.set_last_modified();

create index idx_accounts_last_modified on public.accounts (last_modified);

-- transactions only needs last_modified (the pull-sync watermark) — there is
-- no delete-transaction feature, so an is_deleted column would sit unused.
alter table public.transactions
	add column last_modified timestamptz not null default now();

create trigger transactions_set_last_modified
	before insert or update on public.transactions
	for each row execute function public.set_last_modified();

create index idx_transactions_last_modified on public.transactions (last_modified);
