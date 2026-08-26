-- Second half of making transactions the sole spine of every money
-- operation: these four RPCs stop maintaining accounts.balance at all
-- (00052 drops the column outright — nothing here writes it, so nothing
-- needs to change when that lands) and transfer_between_accounts starts
-- writing the real paired_transaction_id link (00050) for both legs it
-- inserts.
--
-- No client code reads `.account.balance` out of any RPC's JSON response
-- (confirmed by reading src/lib/local/accounts.ts and
-- src/lib/local/expenses.ts directly) — every account row returned below
-- is still included in the response shape callers expect, just without a
-- balance field, since accounts.balance no longer exists as of 00052.
--
-- Same signatures as 00048, so `create or replace` is sufficient — no
-- `drop function` needed.

create or replace function public.create_account_with_transaction(
	p_name text,
	p_user_id uuid,
	p_icon text default 'bank',
	p_currency text default 'PHP',
	p_balance numeric default 0,
	p_id uuid default null,
	p_transaction_id uuid default null
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
	new_account accounts;
begin
	insert into accounts (id, name, user_id, icon, currency)
	values (coalesce(p_id, gen_random_uuid()), p_name, p_user_id, p_icon, p_currency)
	on conflict (id) do update set
		name = excluded.name,
		icon = excluded.icon,
		currency = excluded.currency
	where accounts.user_id = p_user_id
	returning * into new_account;

	if not found then
		raise exception 'Account not found';
	end if;

	insert into transactions (id, account_id, type, amount, currency, description)
	values (coalesce(p_transaction_id, gen_random_uuid()), new_account.id, 'CREATION', p_balance, p_currency, 'Account created')
	on conflict (id) do nothing;

	return row_to_json(new_account);
end;
$function$;

create or replace function public.top_up_account(
	p_account_id uuid,
	p_amount numeric,
	p_user_id uuid,
	p_currency text default 'PHP',
	p_description text default null,
	p_transaction_id uuid default null
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
	account_row accounts;
	new_transaction transactions;
	existing_transaction transactions;
begin
	if (select user_id from accounts where id = p_account_id) != p_user_id then
		raise exception 'Account does not belong to user';
	end if;

	if p_transaction_id is not null then
		select * into existing_transaction from transactions where id = p_transaction_id;
		if found then
			select * into account_row from accounts where id = p_account_id;
			return json_build_object('account', row_to_json(account_row), 'transaction', row_to_json(existing_transaction));
		end if;
	end if;

	if not exists (select 1 from accounts where id = p_account_id) then
		raise exception 'Account not found';
	end if;

	insert into transactions (id, account_id, type, amount, currency, description)
	values (coalesce(p_transaction_id, gen_random_uuid()), p_account_id, 'TOP_UP', p_amount, p_currency, p_description)
	returning * into new_transaction;

	select * into account_row from accounts where id = p_account_id;

	return json_build_object('account', row_to_json(account_row), 'transaction', row_to_json(new_transaction));
end;
$function$;

create or replace function public.transfer_between_accounts(
	p_from_id uuid,
	p_to_id uuid,
	p_amount numeric,
	p_user_id uuid,
	p_currency text default 'PHP',
	p_description text default null,
	p_from_transaction_id uuid default null,
	p_to_transaction_id uuid default null
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
	from_account accounts;
	to_account accounts;
	from_transaction transactions;
	to_transaction transactions;
	existing_from transactions;
	existing_to transactions;
	from_id_val uuid;
	to_id_val uuid;
	folded_balance numeric;
	result json;
begin
	if (select user_id from accounts where id = p_from_id) != p_user_id then
		raise exception 'Source account does not belong to user';
	end if;

	if p_from_transaction_id is not null then
		select * into existing_from from transactions where id = p_from_transaction_id;
		if found then
			select * into from_account from accounts where id = p_from_id;
			select * into to_account from accounts where id = p_to_id;
			select * into existing_to from transactions where id = p_to_transaction_id;
			return json_build_object(
				'from', row_to_json(from_account),
				'to', row_to_json(to_account),
				'from_transaction', row_to_json(existing_from),
				'to_transaction', row_to_json(existing_to)
			);
		end if;
	end if;

	if not exists (select 1 from accounts where id = p_from_id) then
		raise exception 'Source account not found';
	end if;

	if not exists (select 1 from accounts where id = p_to_id) then
		raise exception 'Target account not found';
	end if;

	from_id_val := coalesce(p_from_transaction_id, gen_random_uuid());
	to_id_val := coalesce(p_to_transaction_id, gen_random_uuid());

	insert into transactions (id, account_id, type, amount, currency, description, paired_transaction_id)
	values (from_id_val, p_from_id, 'TRANSFER', -p_amount, p_currency, p_description, to_id_val)
	returning * into from_transaction;

	insert into transactions (id, account_id, type, amount, currency, description, paired_transaction_id)
	values (to_id_val, p_to_id, 'TRANSFER', p_amount, p_currency, p_description, from_id_val)
	returning * into to_transaction;

	select coalesce(sum(amount), 0) into folded_balance from transactions where account_id = p_from_id;

	if folded_balance < 0 then
		raise exception 'Insufficient balance';
	end if;

	select * into from_account from accounts where id = p_from_id;
	select * into to_account from accounts where id = p_to_id;

	result := json_build_object(
		'from', row_to_json(from_account),
		'to', row_to_json(to_account),
		'from_transaction', row_to_json(from_transaction),
		'to_transaction', row_to_json(to_transaction)
	);

	return result;
end;
$function$;

create or replace function public.create_expense(
	p_account_id uuid,
	p_amount numeric,
	p_label text,
	p_date date,
	p_user_id uuid,
	p_payee_id uuid default null,
	p_payee_label text default null,
	p_currency text default 'PHP',
	p_transaction_id uuid default null,
	p_expense_id uuid default null
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
	new_transaction  transactions;
	new_expense      expense_details;
	account_row      accounts;
	final_payee_id   uuid;
	copied_tag_ids   uuid[];
	existing_transaction transactions;
	existing_expense expense_details;
	folded_balance   numeric;
begin
	if p_payee_id is null and (p_payee_label is null or p_payee_label = '') then
		raise exception 'payee is required';
	end if;

	if (select user_id from accounts where id = p_account_id) != p_user_id then
		raise exception 'Account does not belong to user';
	end if;

	if p_transaction_id is not null then
		select * into existing_transaction from transactions where id = p_transaction_id;
		if found then
			select * into account_row from accounts where id = p_account_id;
			select * into existing_expense from expense_details where transaction_id = p_transaction_id;
			select coalesce(array_agg(tag_id), '{}') into copied_tag_ids from expenses_tags where expense_id = existing_expense.id;
			return json_build_object(
				'expense',     row_to_json(existing_expense),
				'transaction', row_to_json(existing_transaction),
				'account',     row_to_json(account_row),
				'tag_ids',     to_json(copied_tag_ids)
			);
		end if;
	end if;

	if not exists (select 1 from accounts where id = p_account_id) then
		raise exception 'Account not found';
	end if;

	if p_payee_id is not null then
		final_payee_id := p_payee_id;
	else
		insert into payees (label, icon, user_id)
		values (p_payee_label, 'store', p_user_id)
		returning id into final_payee_id;
	end if;

	insert into transactions (id, account_id, type, amount, currency)
	values (coalesce(p_transaction_id, gen_random_uuid()), p_account_id, 'EXPENSE', -p_amount, p_currency)
	returning * into new_transaction;

	insert into expense_details (id, user_id, label, date, transaction_id, payee_id)
	values (coalesce(p_expense_id, gen_random_uuid()), p_user_id, p_label, p_date, new_transaction.id, final_payee_id)
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

	select coalesce(sum(amount), 0) into folded_balance from transactions where account_id = p_account_id;

	if folded_balance < 0 then
		raise exception 'Insufficient balance';
	end if;

	select * into account_row from accounts where id = p_account_id;

	return json_build_object(
		'expense',     row_to_json(new_expense),
		'transaction', row_to_json(new_transaction),
		'account',     row_to_json(account_row),
		'tag_ids',     to_json(copied_tag_ids)
	);
end;
$function$;
