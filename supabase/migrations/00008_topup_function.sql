create or replace function top_up_account(
    p_account_id uuid,
    p_amount numeric,
    p_currency text default 'PHP',
    p_description text default null
) returns json
language plpgsql
security definer
as $$
declare
    updated_account accounts;
begin
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
