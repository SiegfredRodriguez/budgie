-- Local-first expense creation needs the copied tag_ids back (the set this
-- call actually copied from the payee, authoritative over whatever the
-- client guessed optimistically from its own local payee/tag data) so the
-- client can reconcile its optimistic expenses_tags rows against the real
-- ones instead of guessing they matched.
create or replace function public.create_expense(
	p_account_id uuid,
	p_amount numeric,
	p_label text,
	p_date date,
	p_user_id uuid,
	p_payee_id uuid default null,
	p_payee_label text default null,
	p_currency text default 'PHP'
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
	new_transaction  transactions;
	new_expense      expense_details;
	updated_account  accounts;
	final_payee_id   uuid;
	copied_tag_ids   uuid[];
begin
	if p_payee_id is null and (p_payee_label is null or p_payee_label = '') then
		raise exception 'payee is required';
	end if;

	if (select user_id from accounts where id = p_account_id) != p_user_id then
		raise exception 'Account does not belong to user';
	end if;

	update accounts
	set balance = balance - p_amount, updated_at = now()
	where id = p_account_id
	returning * into updated_account;

	if not found then
		raise exception 'Account not found';
	end if;

	if updated_account.balance < 0 then
		raise exception 'Insufficient balance';
	end if;

	if p_payee_id is not null then
		final_payee_id := p_payee_id;
	else
		insert into payees (label, icon, user_id)
		values (p_payee_label, 'store', p_user_id)
		returning id into final_payee_id;
	end if;

	insert into transactions (account_id, type, amount, currency)
	values (p_account_id, 'EXPENSE', -p_amount, p_currency)
	returning * into new_transaction;

	insert into expense_details (user_id, label, date, transaction_id, payee_id)
	values (p_user_id, p_label, p_date, new_transaction.id, final_payee_id)
	returning * into new_expense;

	if p_payee_id is not null then
		insert into expenses_tags (expense_id, tag_id)
		select new_expense.id, pt.tag_id
		from payees_tags pt
		where pt.payee_id = p_payee_id;

		select coalesce(array_agg(tag_id), '{}') into copied_tag_ids
		from expenses_tags where expense_id = new_expense.id;
	else
		copied_tag_ids := '{}';
	end if;

	return json_build_object(
		'expense',     row_to_json(new_expense),
		'transaction', row_to_json(new_transaction),
		'account',     row_to_json(updated_account),
		'tag_ids',     to_json(copied_tag_ids)
	);
end;
$function$;
