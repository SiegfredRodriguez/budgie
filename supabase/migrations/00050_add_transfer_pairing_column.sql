-- Real server-side link between the two legs of a TRANSFER, replacing
-- today's implicit pairing (type='TRANSFER' + opposite amount + close
-- timestamp — never enforced or stored). Self-referencing, nullable: only
-- TRANSFER rows get one.
--
-- DEFERRABLE INITIALLY DEFERRED: transfer_between_accounts (00051) inserts
-- both rows in one implicit transaction, each already pointing at the
-- other's (pre-resolved) id — the first insert's target doesn't exist as a
-- row yet. Deferring the FK check to the end of the transaction lets both
-- land before either is validated.
--
-- Existing TRANSFER rows are left with paired_transaction_id = null. A
-- backfill guessing historical pairings from timestamp/amount proximity
-- was considered and rejected as too risky to run unattended against real
-- financial data. That's why the constraint below is one-directional
-- (pairing implies TRANSFER, not the reverse) rather than requiring every
-- TRANSFER row to be paired: it holds trivially for pre-existing unpaired
-- rows.
alter table public.transactions
	add column paired_transaction_id uuid
		references public.transactions(id)
		deferrable initially deferred;

alter table public.transactions
	add constraint transactions_paired_transaction_id_not_self
	check (paired_transaction_id is distinct from id);

alter table public.transactions
	add constraint transactions_pairing_requires_transfer
	check (paired_transaction_id is null or type = 'TRANSFER');

create unique index transactions_paired_transaction_id_key
	on public.transactions (paired_transaction_id)
	where paired_transaction_id is not null;
