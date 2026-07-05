drop function if exists create_account_with_transaction(p_name text, p_icon text, p_currency text, p_balance numeric);
drop function if exists top_up_account(p_account_id uuid, p_amount numeric, p_currency text, p_description text);
drop function if exists transfer_between_accounts(p_from_id uuid, p_to_id uuid, p_amount numeric, p_currency text, p_description text);

-- from 00008_topup_function.sql
create or replace function top_up_account(
    p_account_id uuid,
    p_amount numeric,
    p_user_id uuid,
    p_currency text default 'PHP',
    p_description text default null
) returns json
language plpgsql
security definer
as $$
declare
    updated_account accounts;
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
    values (p_account_id, 'TOP_UP', p_amount, p_currency, p_description);

    return row_to_json(updated_account);
end;
$$;

-- from 00009_transfer_function.sql
create or replace function transfer_between_accounts(
    p_from_id uuid,
    p_to_id uuid,
    p_amount numeric,
    p_user_id uuid,
    p_currency text default 'PHP',
    p_description text default null
) returns json
language plpgsql
security definer
as $$
declare
    from_account accounts;
    to_account accounts;
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

    insert into transactions (account_id, type, amount, currency, description, related_account_id)
    values (p_from_id, 'TRANSFER', -p_amount, p_currency, p_description, p_to_id);

    insert into transactions (account_id, type, amount, currency, description, related_account_id)
    values (p_to_id, 'TRANSFER', p_amount, p_currency, p_description, p_from_id);

    result := json_build_object(
        'from', row_to_json(from_account),
        'to', row_to_json(to_account)
    );

    return result;
end;
$$;
