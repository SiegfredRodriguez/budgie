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

export interface LocalAccount {
	id: string;
	name: string;
	icon: string;
	currency: string;
	balance: number;
	user_id: string;
	created_at: string;
	last_modified: string;
	is_deleted: boolean;
	_synced: 0 | 1;
}

/** Money-moving transactions (TOP_UP/TRANSFER) are never retried
 * automatically like tags/payees/account-creation are — calling the RPC
 * twice really moves money twice, so there's no safe generic "retry
 * unsynced rows" path for them. `_synced: 0` here instead means "an
 * optimistic prediction of a transaction whose real outcome (success,
 * failure, or genuinely unknown because the tab closed mid-request) hasn't
 * been confirmed yet" — `local/accounts.ts` reconciles or discards these
 * explicitly rather than blindly re-pushing them. No `is_deleted`: nothing
 * ever deletes a transaction. */
export interface LocalTransaction {
	id: string;
	account_id: string;
	type: string;
	amount: number;
	currency: string;
	description: string | null;
	created_at: string;
	last_modified: string;
	_synced: 0 | 1;
}

const db = new Dexie("budgie") as Dexie & {
	tags: EntityTable<LocalTag, "id">;
	payees: EntityTable<LocalPayee, "id">;
	payeesTags: Dexie.Table<LocalPayeeTag, [string, string]>;
	accounts: EntityTable<LocalAccount, "id">;
	transactions: EntityTable<LocalTransaction, "id">;
};

db.version(1).stores({
	tags: "id, value, last_modified, _synced",
});

db.version(2).stores({
	payees: "id, user_id, label, last_modified, _synced",
	payeesTags: "[payee_id+tag_id], payee_id, tag_id, last_modified, _synced",
});

db.version(3).stores({
	accounts: "id, user_id, created_at, last_modified, _synced",
	transactions: "id, account_id, created_at, last_modified, _synced",
});

export { db };
