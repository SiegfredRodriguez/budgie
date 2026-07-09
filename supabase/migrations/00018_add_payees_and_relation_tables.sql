create table if not exists payees (
    id uuid primary key default gen_random_uuid(),
    label varchar not null
);

create table if not exists expenses_tags (
    expense_detail_id uuid not null references expense_details(id) on delete cascade,
    tag_id uuid not null references tag(id) on delete cascade,
    primary key (expense_detail_id, tag_id)
);

create table if not exists payees_tags (
    payee_id uuid not null references payees(id) on delete cascade,
    tag_id uuid not null references tag(id) on delete cascade,
    primary key (payee_id, tag_id)
);

alter table payees enable row level security;
alter table expenses_tags enable row level security;
alter table payees_tags enable row level security;

create policy "Everyone can view payees"
    on payees for select
    to authenticated
    using (true);

create policy "Authenticated users can insert payees"
    on payees for insert
    to authenticated
    with check (true);

create policy "Authenticated users can delete payees"
    on payees for delete
    to authenticated
    using (true);

create policy "Users can view expenses_tags"
    on expenses_tags for select
    to authenticated
    using (true);

create policy "Authenticated users can manage expenses_tags"
    on expenses_tags for insert
    to authenticated
    with check (true);

create policy "Authenticated users can delete expenses_tags"
    on expenses_tags for delete
    to authenticated
    using (true);

create policy "Everyone can view payees_tags"
    on payees_tags for select
    to authenticated
    using (true);

create policy "Authenticated users can insert payees_tags"
    on payees_tags for insert
    to authenticated
    with check (true);

create policy "Authenticated users can delete payees_tags"
    on payees_tags for delete
    to authenticated
    using (true);

grant usage on schema public to authenticated;
grant select, insert, delete on public.payees to authenticated;
grant select, insert, delete on public.expenses_tags to authenticated;
grant select, insert, delete on public.payees_tags to authenticated;
