-- One-time gate before the transactions-as-spine restructuring drops
-- accounts.balance (00052) and stops maintaining it (00051). Aborts (raises
-- exception, rolling back this file since a DO block runs in its own
-- implicit transaction) if any account's stored balance disagrees with
-- SUM(transactions.amount) for that account. No schema change — purely a
-- read-only consistency check, safe to re-run.
do $$
declare
	mismatch record;
	mismatch_count int := 0;
begin
	for mismatch in
		select a.id, a.name, a.balance as stored_balance,
			coalesce(sum(t.amount), 0) as folded_balance
		from accounts a
		left join transactions t on t.account_id = a.id
		group by a.id, a.name, a.balance
		having a.balance <> coalesce(sum(t.amount), 0)
	loop
		mismatch_count := mismatch_count + 1;
		raise warning 'Account % (%) balance mismatch: stored=%, folded=%',
			mismatch.id, mismatch.name, mismatch.stored_balance, mismatch.folded_balance;
	end loop;

	if mismatch_count > 0 then
		raise exception '% account(s) have a stored balance that does not match the folded transaction sum — investigate before dropping accounts.balance', mismatch_count;
	end if;
end $$;
