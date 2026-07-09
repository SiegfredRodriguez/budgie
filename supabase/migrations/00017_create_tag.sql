create table if not exists tag (
    id uuid primary key default gen_random_uuid(),
    value varchar not null unique
);

alter table tag enable row level security;

create policy "Everyone can view tags"
    on tag for select
    to authenticated
    using (true);

create policy "Authenticated users can insert tags"
    on tag for insert
    to authenticated
    with check (true);

grant usage on schema public to authenticated;
grant select, insert on public.tag to authenticated;
