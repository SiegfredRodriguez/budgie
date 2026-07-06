create or replace function create_account_with_transaction(
    p_name text,
    p_user_id uuid,
    p_icon text default 'bank',
    p_currency text default 'PHP',
    p_balance numeric default 0
) returns json
language plpgsql
set search_path = 'public'
security definer
as $$
declare
    new_account accounts;
begin
    insert into accounts (name, user_id, icon, currency, balance)
    values (p_name, p_user_id, p_icon, p_currency, p_balance)
    returning * into new_account;

    insert into transactions (account_id, type, amount, currency, description)
    values (new_account.id, 'CREATION', p_balance, p_currency, 'Account created');

    return row_to_json(new_account);
end;
$$;

create or replace function top_up_account(
    p_account_id uuid,
    p_amount numeric,
    p_user_id uuid,
    p_currency text default 'PHP',
    p_description text default null
) returns json
language plpgsql
set search_path = 'public'
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

create or replace function transfer_between_accounts(
    p_from_id uuid,
    p_to_id uuid,
    p_amount numeric,
    p_user_id uuid,
    p_currency text default 'PHP',
    p_description text default null
) returns json
language plpgsql
set search_path = 'public'
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

create or replace function create_expense(
    p_account_id uuid,
    p_amount numeric,
    p_label text,
    p_date date,
    p_user_id uuid,
    p_currency text default 'PHP'
) returns json
language plpgsql
set search_path = 'public'
security definer
as $$
declare
    new_expense expense_details;
    updated_account accounts;
    new_transaction transactions;
begin
    if (select user_id from accounts where id = p_account_id) != p_user_id then
        raise exception 'Account does not belong to user';
    end if;

    insert into expense_details (user_id, label, date)
    values (p_user_id, p_label, p_date)
    returning * into new_expense;

    update accounts
    set balance = balance - p_amount,
        updated_at = now()
    where id = p_account_id
    returning * into updated_account;

    if not found then
        delete from expense_details where id = new_expense.id;
        raise exception 'Account not found';
    end if;

    if updated_account.balance < 0 then
        delete from expense_details where id = new_expense.id;
        raise exception 'Insufficient balance';
    end if;

    insert into transactions (account_id, type, amount, currency, expense_id)
    values (p_account_id, 'EXPENSE', -p_amount, p_currency, new_expense.id)
    returning * into new_transaction;

    return json_build_object(
        'expense', row_to_json(new_expense),
        'transaction', row_to_json(new_transaction),
        'account', row_to_json(updated_account)
    );
end;
$$;
