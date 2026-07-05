create or replace function create_account_with_transaction(
    p_name text,
    p_user_id uuid,
    p_icon text default 'bank',
    p_currency text default 'PHP',
    p_balance numeric default 0
) returns json
language plpgsql
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
