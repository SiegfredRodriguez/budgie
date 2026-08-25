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

const db = new Dexie("budgie") as Dexie & {
	tags: EntityTable<LocalTag, "id">;
};

db.version(1).stores({
	tags: "id, value, last_modified, _synced",
});

export { db };
