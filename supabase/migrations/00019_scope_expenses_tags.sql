drop policy if exists "Users can view expenses_tags" on expenses_tags;
drop policy if exists "Authenticated users can manage expenses_tags" on expenses_tags;
drop policy if exists "Authenticated users can delete expenses_tags" on expenses_tags;

create policy "Users can view their own expenses_tags"
    on expenses_tags for select
    to authenticated
    using (
        exists (
            select 1 from expense_details
            where id = expense_detail_id and user_id = auth.uid()
        )
    );

create policy "Users can insert their own expenses_tags"
    on expenses_tags for insert
    to authenticated
    with check (
        exists (
            select 1 from expense_details
            where id = expense_detail_id and user_id = auth.uid()
        )
    );

create policy "Users can delete their own expenses_tags"
    on expenses_tags for delete
    to authenticated
    using (
        exists (
            select 1 from expense_details
            where id = expense_detail_id and user_id = auth.uid()
        )
    );
