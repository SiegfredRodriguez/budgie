-- Remove useless related_account_id from transactions
alter table transactions drop column if exists related_account_id;

-- Add transaction_id FK to expense_details
alter table expense_details add column if not exists transaction_id uuid references transactions(id) on delete set null;

create index if not exists idx_expense_details_transaction_id on expense_details(transaction_id);

-- Update create_expense function to use transaction_id on expense_details
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
    new_transaction transactions;
    new_expense expense_details;
    updated_account accounts;
begin
    if (select user_id from accounts where id = p_account_id) != p_user_id then
        raise exception 'Account does not belong to user';
    end if;

    update accounts
    set balance = balance - p_amount,
        updated_at = now()
    where id = p_account_id
    returning * into updated_account;

    if not found then
        raise exception 'Account not found';
    end if;

    if updated_account.balance < 0 then
        raise exception 'Insufficient balance';
    end if;

    insert into transactions (account_id, type, amount, currency)
    values (p_account_id, 'EXPENSE', -p_amount, p_currency)
    returning * into new_transaction;

    insert into expense_details (user_id, label, date, transaction_id)
    values (p_user_id, p_label, p_date, new_transaction.id)
    returning * into new_expense;

    return json_build_object(
        'expense', row_to_json(new_expense),
        'transaction', row_to_json(new_transaction),
        'account', row_to_json(updated_account)
    );
end;
$$;

-- Update transfer_between_accounts to remove related_account_id
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

    insert into transactions (account_id, type, amount, currency, description)
    values (p_from_id, 'TRANSFER', -p_amount, p_currency, p_description);

    insert into transactions (account_id, type, amount, currency, description)
    values (p_to_id, 'TRANSFER', p_amount, p_currency, p_description);

    result := json_build_object(
        'from', row_to_json(from_account),
        'to', row_to_json(to_account)
    );

    return result;
end;
$$;
