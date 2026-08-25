import Dexie, { type EntityTable } from "dexie";

/**
 * Local-first storage: every table mirrors its Postgres counterpart plus
 * two sync-bookkeeping columns. `last_modified` is always the *server's*
 * value (never trust a client-side clock for it) — it's the watermark an
 * incremental pull compares against. `_synced` is purely local: 0 means
 * this row has a write that hasn't been confirmed by the server yet.
 */
export interface LocalTag {
	id: string;
	value: string;
	last_modified: string;
	is_deleted: boolean;
	_synced: 0 | 1;
}

export interface LocalPayee {
	id: string;
	label: string;
	icon: string;
	user_id: string;
	last_modified: string;
	is_deleted: boolean;
	_synced: 0 | 1;
}

/** Junction row for the payee↔tag many-to-many. No `is_deleted` — there's
 * no remove-tag-from-payee feature today, so links are only ever added,
 * never revoked; a hard delete (cascading from the payee or tag side)
 * remains fine for the day one is. */
export interface LocalPayeeTag {
	payee_id: string;
	tag_id: string;
	last_modified: string;
	_synced: 0 | 1;
}

const db = new Dexie("budgie") as Dexie & {
	tags: EntityTable<LocalTag, "id">;
	payees: EntityTable<LocalPayee, "id">;
	payeesTags: Dexie.Table<LocalPayeeTag, [string, string]>;
};

db.version(1).stores({
	tags: "id, value, last_modified, _synced",
});

db.version(2).stores({
	payees: "id, user_id, label, last_modified, _synced",
	payeesTags: "[payee_id+tag_id], payee_id, tag_id, last_modified, _synced",
});

export { db };
