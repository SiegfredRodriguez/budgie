alter table accounts add column if not exists user_id uuid references auth.users(id);

alter table accounts enable row level security;
alter table transactions enable row level security;

create index if not exists idx_accounts_user_id on accounts(user_id);

create policy "Users can view their own accounts"
    on accounts for select
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can insert their own accounts"
    on accounts for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "Users can update their own accounts"
    on accounts for update
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can delete their own accounts"
    on accounts for delete
    to authenticated
    using (auth.uid() = user_id);

create policy "Users can view transactions on their accounts"
    on transactions for select
    to authenticated
    using (
        account_id in (select id from accounts where user_id = auth.uid())
    );

create policy "Users can insert transactions on their accounts"
    on transactions for insert
    to authenticated
    with check (
        account_id in (select id from accounts where user_id = auth.uid())
    );

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.accounts to authenticated;
grant select, insert on public.transactions to authenticated;

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
