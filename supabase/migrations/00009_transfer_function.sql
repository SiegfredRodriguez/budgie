create or replace function transfer_between_accounts(
    p_from_id uuid,
    p_to_id uuid,
    p_amount numeric,
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
    -- lock and deduct from source
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

    -- credit to target
    update accounts
    set balance = balance + p_amount,
        updated_at = now()
    where id = p_to_id
    returning * into to_account;

    if not found then
        -- rollback: restore source balance
        update accounts set balance = balance + p_amount where id = p_from_id;
        raise exception 'Target account not found';
    end if;

    -- insert transaction for source (negative amount)
    insert into transactions (account_id, type, amount, currency, description, related_account_id)
    values (p_from_id, 'TRANSFER', -p_amount, p_currency, p_description, p_to_id);

    -- insert transaction for target (positive amount)
    insert into transactions (account_id, type, amount, currency, description, related_account_id)
    values (p_to_id, 'TRANSFER', p_amount, p_currency, p_description, p_from_id);

    result := json_build_object(
        'from', row_to_json(from_account),
        'to', row_to_json(to_account)
    );

    return result;
end;
$$;
