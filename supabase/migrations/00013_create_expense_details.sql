create table if not exists expense_details (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    label text not null,
    date date not null,
    created_at timestamptz not null default now()
);

alter table transactions add column if not exists expense_id uuid references expense_details(id) on delete set null;

create index if not exists idx_expense_details_user_id on expense_details(user_id);
create index if not exists idx_transactions_expense_id on transactions(expense_id);

alter table expense_details enable row level security;

create policy "Users can view their own expense details"
    on expense_details for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can insert their own expense details"
    on expense_details for insert
    to authenticated
    with check (auth.uid() = user_id);

grant usage on schema public to authenticated;
grant select, insert on public.expense_details to authenticated;

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
