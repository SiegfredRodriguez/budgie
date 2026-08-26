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
	/** No longer authoritative locally — balance is derived by folding
	 * `transactions` for this account (see local/accounts.ts's
	 * observeAccounts()). This field is only an informational value kept in
	 * sync by pullAccounts()'s server pull and the Realtime `accounts`
	 * payload handler; nothing reads it for display anymore. */
	balance?: number;
	user_id: string;
	created_at: string;
	last_modified: string;
	is_deleted: boolean;
	_synced: 0 | 1;
}

/** Money-moving transactions (TOP_UP/TRANSFER/EXPENSE) are idempotent —
 * see 00047_ledger_idempotent_retry.sql — so, unlike an earlier version of
 * this comment claimed, they *are* safe to queue offline and retry: the
 * RPC accepts this row's own `id` as the transaction id, and returns the
 * already-applied outcome instead of re-running the balance change if it's
 * called twice for the same id. `_synced: 0` means "written locally, not
 * yet confirmed" — `local/ledger.ts` retries these in `created_at` order
 * (the action-timestamp the operation was actually performed at) whenever
 * the app is online. `_error` is set only once the server has definitively
 * rejected the operation (e.g. insufficient balance) — a terminal state,
 * never retried again, surfaced to the user rather than silently dropped
 * or endlessly reattempted. No `is_deleted`: nothing ever deletes a
 * transaction. */
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
	/** Groups the rows belonging to one logical operation for retry
	 * purposes: equal to `id` for a TOP_UP or an EXPENSE's transaction row,
	 * shared between both legs of a TRANSFER, and shared with the paired
	 * LocalExpenseDetail row for an EXPENSE. */
	operation_id: string;
	_error?: string;
}

export interface LocalExpenseDetail {
	id: string;
	user_id: string;
	label: string;
	date: string;
	transaction_id: string;
	payee_id: string | null;
	/** Set only on an optimistic prediction for a *novel* payee (no
	 * `payee_id` yet) so the UI has something to render before the real
	 * payee row exists locally — never sent to or read back from the
	 * server, and cleared once reconciliation replaces this row with the
	 * server's real one (which by then has a real `payee_id`). */
	novel_payee_label?: string;
	last_modified: string;
	_synced: 0 | 1;
	/** Mirrors the paired LocalTransaction's `_error`, set at the same
	 * time, so the UI can show a failed expense without a second lookup. */
	_error?: string;
}

/** Junction row for the expense↔tag many-to-many, copied atomically from
 * the payee's own tags at expense-creation time — never independently
 * added to or removed from afterward, so (like LocalPayeeTag) no
 * `is_deleted`. */
export interface LocalExpenseTag {
	expense_id: string;
	tag_id: string;
	last_modified: string;
	_synced: 0 | 1;
}

const db = new Dexie("budgie") as Dexie & {
	tags: EntityTable<LocalTag, "id">;
	payees: EntityTable<LocalPayee, "id">;
	payeesTags: Dexie.Table<LocalPayeeTag, [string, string]>;
	accounts: EntityTable<LocalAccount, "id">;
	transactions: EntityTable<LocalTransaction, "id">;
	expenseDetails: EntityTable<LocalExpenseDetail, "id">;
	expensesTags: Dexie.Table<LocalExpenseTag, [string, string]>;
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

db.version(4).stores({
	expenseDetails: "id, user_id, date, transaction_id, payee_id, last_modified, _synced",
	expensesTags: "[expense_id+tag_id], expense_id, tag_id, last_modified, _synced",
});

db.version(5).stores({
	transactions: "id, account_id, operation_id, created_at, last_modified, _synced",
});

export { db };
