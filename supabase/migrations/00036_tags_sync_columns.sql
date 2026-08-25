-- Adds server-authoritative sync bookkeeping to `tags`, the first entity in
-- the local-first (Dexie) rollout. `last_modified` is stamped by a trigger,
-- never trusted from the client, so it's safe to use as the watermark for
-- incremental pulls. `is_deleted` is a tombstone: deletes become updates so
-- a pull that only asks for "changes since X" still sees them.

alter table tags
	add column last_modified timestamptz not null default now(),
	add column is_deleted boolean not null default false;

create or replace function set_last_modified()
returns trigger
language plpgsql
set search_path = 'public'
as $$
begin
	new.last_modified = now();
	return new;
end;
$$;

create trigger tags_set_last_modified
	before insert or update on tags
	for each row
	execute function set_last_modified();

create index idx_tags_last_modified on tags (last_modified);
