-- Same scaffolding as accounts/payees: last_modified as the incremental-pull
-- watermark. No is_deleted on either table — there is no delete-expense
-- feature in the UI, so a tombstone column would sit unused (matches the
-- same call made for `transactions` in 00041).
alter table public.expense_details
	add column last_modified timestamptz not null default now();

create trigger expense_details_set_last_modified
	before insert or update on public.expense_details
	for each row execute function public.set_last_modified();

create index idx_expense_details_last_modified on public.expense_details (last_modified);

alter table public.expenses_tags
	add column last_modified timestamptz not null default now();

create trigger expenses_tags_set_last_modified
	before insert or update on public.expenses_tags
	for each row execute function public.set_last_modified();

create index idx_expenses_tags_last_modified on public.expenses_tags (last_modified);
