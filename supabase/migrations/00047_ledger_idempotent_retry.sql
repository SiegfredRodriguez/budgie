-- Lets top-up/transfer/expense-creation be queued offline and retried
-- later without risking a double-application: each accepts an optional
-- client-generated transaction (and, for create_expense, expense) id, and
-- if a row with that id already exists, returns the already-applied
-- outcome instead of re-running the balance change. A retry after a
-- network drop can't know whether the first attempt actually landed, so
-- the operation has to be safe to attempt twice.
--
-- `create or replace` only replaces a function with the exact same
-- argument list, so the old signatures have to be dropped explicitly first
-- (same issue as 00042's create_account_with_transaction change).
drop function if exists public.top_up_account(uuid, numeric, uuid, text, text);
drop function if exists public.transfer_between_accounts(uuid, uuid, numeric, uuid, text, text);
drop function if exists public.create_expense(uuid, numeric, text, date, uuid, uuid, text, text);

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
	updated_account accounts;
	new_transaction transactions;
	existing_transaction transactions;
begin
	if (select user_id from accounts where id = p_account_id) != p_user_id then
		raise exception 'Account does not belong to user';
	end if;

	if p_transaction_id is not null then
		select * into existing_transaction from transactions where id = p_transaction_id;
		if found then
			select * into updated_account from accounts where id = p_account_id;
			return json_build_object('account', row_to_json(updated_account), 'transaction', row_to_json(existing_transaction));
		end if;
	end if;

	update accounts
	set balance = balance + p_amount,
		updated_at = now()
	where id = p_account_id
	returning * into updated_account;

	if not found then
		raise exception 'Account not found';
	end if;

	insert into transactions (id, account_id, type, amount, currency, description)
	values (coalesce(p_transaction_id, gen_random_uuid()), p_account_id, 'TOP_UP', p_amount, p_currency, p_description)
	returning * into new_transaction;

	return json_build_object('account', row_to_json(updated_account), 'transaction', row_to_json(new_transaction));
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

	update accounts
	set balance = balance - p_amount,
		updated_at = now()
	where id = p_from_id
	returning * into from_account;

	if not found then
		raise exception 'Source account not found';
	end if;

	if from_account.balance < 0 then
		raise exception 'Insufficient balance';
	end if;

	update accounts
	set balance = balance + p_amount,
		updated_at = now()
	where id = p_to_id
	returning * into to_account;

	if not found then
		update accounts set balance = balance + p_amount where id = p_from_id;
		raise exception 'Target account not found';
	end if;

	insert into transactions (id, account_id, type, amount, currency, description)
	values (coalesce(p_from_transaction_id, gen_random_uuid()), p_from_id, 'TRANSFER', -p_amount, p_currency, p_description)
	returning * into from_transaction;

	insert into transactions (id, account_id, type, amount, currency, description)
	values (coalesce(p_to_transaction_id, gen_random_uuid()), p_to_id, 'TRANSFER', p_amount, p_currency, p_description)
	returning * into to_transaction;

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
	updated_account  accounts;
	final_payee_id   uuid;
	copied_tag_ids   uuid[];
	existing_transaction transactions;
	existing_expense expense_details;
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
			select * into updated_account from accounts where id = p_account_id;
			select * into existing_expense from expense_details where transaction_id = p_transaction_id;
			select coalesce(array_agg(tag_id), '{}') into copied_tag_ids from expenses_tags where expense_id = existing_expense.id;
			return json_build_object(
				'expense',     row_to_json(existing_expense),
				'transaction', row_to_json(existing_transaction),
				'account',     row_to_json(updated_account),
				'tag_ids',     to_json(copied_tag_ids)
			);
		end if;
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

	return json_build_object(
		'expense',     row_to_json(new_expense),
		'transaction', row_to_json(new_transaction),
		'account',     row_to_json(updated_account),
		'tag_ids',     to_json(copied_tag_ids)
	);
end;
$function$;
