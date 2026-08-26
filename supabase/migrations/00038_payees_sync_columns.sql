-- Second entity in the local-first (Dexie) rollout, same scheme as tags
-- (see 00036_tags_sync_columns.sql): server-stamped `last_modified` as the
-- pull watermark, `is_deleted` as the tombstone. `payees_tags` is a pure
-- junction with no delete-link feature today, so it only needs
-- `last_modified` — new links are picked up by an incremental pull,
-- existing ones are still hard-deleted via CASCADE if a payee or tag goes.

alter table payees
	add column last_modified timestamptz not null default now(),
	add column is_deleted boolean not null default false;

create trigger payees_set_last_modified
	before insert or update on payees
	for each row
	execute function set_last_modified();

create index idx_payees_last_modified on payees (last_modified);

alter table payees_tags
	add column last_modified timestamptz not null default now();

create trigger payees_tags_set_last_modified
	before insert or update on payees_tags
	for each row
	execute function set_last_modified();

create index idx_payees_tags_last_modified on payees_tags (last_modified);
