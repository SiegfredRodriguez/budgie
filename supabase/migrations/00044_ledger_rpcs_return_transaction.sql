-- Local-first top-up/transfer needs the server-generated transaction id
-- back, so the client can key its reconciled local row by the same id the
-- transaction will later arrive under via Realtime/pull-sync — otherwise
-- the optimistic client-generated id and the real server row end up as two
-- separate, duplicate-looking rows once both are present locally.
create or replace function public.top_up_account(p_account_id uuid, p_amount numeric, p_user_id uuid, p_currency text default 'PHP'::text, p_description text default NULL::text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
	updated_account accounts;
	new_transaction transactions;
begin
	if (select user_id from accounts where id = p_account_id) != p_user_id then
		raise exception 'Account does not belong to user';
	end if;

	update accounts
	set balance = balance + p_amount,
		updated_at = now()
	where id = p_account_id
	returning * into updated_account;

	if not found then
		raise exception 'Account not found';
	end if;

	insert into transactions (account_id, type, amount, currency, description)
	values (p_account_id, 'TOP_UP', p_amount, p_currency, p_description)
	returning * into new_transaction;

	return json_build_object('account', row_to_json(updated_account), 'transaction', row_to_json(new_transaction));
end;
$function$;

create or replace function public.transfer_between_accounts(p_from_id uuid, p_to_id uuid, p_amount numeric, p_user_id uuid, p_currency text default 'PHP'::text, p_description text default NULL::text)
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
	result json;
begin
	if (select user_id from accounts where id = p_from_id) != p_user_id then
		raise exception 'Source account does not belong to user';
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

	insert into transactions (account_id, type, amount, currency, description)
	values (p_from_id, 'TRANSFER', -p_amount, p_currency, p_description)
	returning * into from_transaction;

	insert into transactions (account_id, type, amount, currency, description)
	values (p_to_id, 'TRANSFER', p_amount, p_currency, p_description)
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
