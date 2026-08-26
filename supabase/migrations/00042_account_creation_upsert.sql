-- Lets a locally-generated account (and its CREATION transaction) be pushed
-- with client-chosen ids and safely retried: a retry after a network error
-- must not know whether the first attempt actually landed, so the insert
-- has to be idempotent rather than blindly re-inserting. Ownership is still
-- always derived server-side from the authenticated caller (p_user_id, set
-- by the edge function from the caller's session — never from the payload),
-- matching every other endpoint in this project.
--
-- The `where accounts.user_id = p_user_id` guard on the conflict update
-- means a (practically impossible, but cheap to rule out) id collision with
-- another user's account silently no-ops the update instead of letting one
-- user's client-generated id overwrite another user's row.
--
-- `create or replace` only replaces a function with the exact same argument
-- list — adding p_id/p_transaction_id makes this a distinct overload, which
-- left PostgREST unable to pick between the two and rejecting every call.
-- The old 5-arg signature has to be dropped explicitly, not just replaced.
drop function if exists public.create_account_with_transaction(text, uuid, text, text, numeric);

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
	insert into accounts (id, name, user_id, icon, currency, balance)
	values (coalesce(p_id, gen_random_uuid()), p_name, p_user_id, p_icon, p_currency, p_balance)
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
