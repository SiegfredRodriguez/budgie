import { db, type LocalTransaction } from "$lib/db";
import { supabase } from "$lib/supabase";
import { callFunction, NetworkError } from "$lib/api";
import { liveQueryStore } from "$lib/local/liveQueryStore";

export interface Account {
	id: string;
	icon: string;
	label: string;
	currency: string;
	balance: number;
}

export interface Transaction {
	id: string;
	type: string;
	amount: number;
	currency: string;
	description: string | null;
	created_at: string;
	pending: boolean;
	error?: string;
}

/** Outcome of trying to push one already-recorded local ledger operation
 * (top-up, transfer, or — see local/expenses.ts — an expense) to the
 * server. Every ledger RPC is idempotent (00047_ledger_idempotent_retry.sql
 * — the client's own id is the idempotency key), so calling one of these
 * again for the same row is always safe: "network-error" means the
 * attempt never reached the server at all (try again once back online);
 * "business-error" means it did reach the server and was definitively
 * rejected (e.g. insufficient balance) — retrying won't change that. */
export type AttemptResult = { kind: "success" } | { kind: "network-error" } | { kind: "business-error"; message: string };

function toAccount(r: { id: string; name: string; icon: string; currency: string; balance: number }): Account {
	return { id: r.id, label: r.name, icon: r.icon, currency: r.currency, balance: r.balance };
}

function toTransaction(r: LocalTransaction): Transaction {
	return {
		id: r.id,
		type: r.type,
		amount: r.amount,
		currency: r.currency,
		description: r.description,
		created_at: r.created_at,
		pending: r._synced === 0 && !r._error,
		error: r._error,
	};
}

/** Same session-race fix as observePayees(): re-resolves the session on
 * every run instead of trusting a userId captured once at mount. */
export function observeAccounts() {
	return liveQueryStore(async () => {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		const userId = session?.user.id;
		const accounts = await db.accounts.toArray();
		return accounts
			.filter((a) => !a.is_deleted && a.user_id === userId)
			.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
			.map(toAccount);
	}, [] as Account[]);
}

export function observeTransactions(accountId: string) {
	return liveQueryStore(async () => {
		const rows = await db.transactions.where("account_id").equals(accountId).toArray();
		return rows
			.slice()
			.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
			.map(toTransaction);
	}, [] as Transaction[]);
}

export async function createAccount(
	name: string,
	icon: string,
	currency: string,
	balance: number,
	userId: string,
): Promise<Account> {
	const trimmed = name.trim() || "Untitled Account";
	const id = crypto.randomUUID();
	const transactionId = crypto.randomUUID();
	const now = new Date().toISOString();

	await db.transaction("rw", [db.accounts, db.transactions], async () => {
		await db.accounts.put({
			id,
			name: trimmed,
			icon: icon || "wallet",
			currency,
			balance,
			user_id: userId,
			created_at: now,
			last_modified: now,
			is_deleted: false,
			_synced: 0,
		});
		await db.transactions.put({
			id: transactionId,
			operation_id: transactionId,
			account_id: id,
			type: "CREATION",
			amount: balance,
			currency,
			description: "Account created",
			created_at: now,
			last_modified: now,
			_synced: 1, // not independently retried — pushed as part of the account below
		});
	});

	pushAccount(id, transactionId).catch((e) => console.error("Account sync failed, will retry:", e));

	return { id, label: trimmed, icon: icon || "wallet", currency, balance };
}

async function pushAccount(id: string, transactionId: string): Promise<void> {
	const row = await db.accounts.get(id);
	if (!row) return;

	const saved = await callFunction<{ id: string; last_modified: string }>("create-account", {
		id: row.id,
		transaction_id: transactionId,
		name: row.name,
		icon: row.icon,
		currency: row.currency,
		balance: row.balance,
	});

	await db.accounts.update(id, { last_modified: saved.last_modified, _synced: 1 });
}

/** Waits for a specific account to be confirmed on the server — needed
 * before top-up/transfer, whose RPCs look the account up server-side and
 * would fail "Account not found" against one that hasn't landed yet.
 * Mirrors ensureTagSynced/ensurePayeeSynced. Callers that can tolerate the
 * account still being pending (money-movement queued offline) should catch
 * NetworkError specifically rather than treating every failure alike. */
export async function ensureAccountSynced(id: string): Promise<string> {
	const row = await db.accounts.get(id);
	if (row?._synced) return id;
	// createAccount's push already carries the CREATION transaction; a
	// bare retry here only needs the account's own fields.
	const transactionRow = await db.transactions.where("account_id").equals(id).and((t) => t.type === "CREATION").first();
	await pushAccount(id, transactionRow?.id ?? crypto.randomUUID());
	return id;
}

export async function deleteAccount(id: string): Promise<void> {
	await db.accounts.update(id, { is_deleted: true, _synced: 0 });
	pushDelete(id).catch((e) => console.error("Account delete sync failed, will retry:", e));
}

async function pushDelete(id: string): Promise<void> {
	const saved = await callFunction<{ id: string; last_modified: string }>("delete-account", { id });
	await db.accounts.update(id, { last_modified: saved.last_modified, _synced: 1 });
}

/** Pure "try the network call, reconcile on success" — no side effects on
 * failure of any kind. What a failure *means* differs by caller: the
 * immediate UI path (topUpAccount) rolls a business-error back entirely
 * since the user is still looking at the dialog and can just fix the form;
 * the deferred retry path (local/ledger.ts, for a row that was queued
 * offline) instead marks it as a permanent error and moves on, since
 * there's no dialog left to show it in. Exported for local/ledger.ts. */
export async function attemptTopUp(row: LocalTransaction): Promise<AttemptResult> {
	try {
		const saved = await callFunction<{
			account: { balance: number; last_modified: string };
			transaction: { id: string; last_modified: string };
		}>("top-up-account", {
			account_id: row.account_id,
			amount: row.amount,
			currency: row.currency,
			description: row.description,
			transaction_id: row.id,
		});
		await db.transaction("rw", [db.accounts, db.transactions], async () => {
			await db.accounts.update(row.account_id, { balance: saved.account.balance, last_modified: saved.account.last_modified, _synced: 1 });
			await db.transactions.update(row.id, { last_modified: saved.transaction.last_modified, _synced: 1 });
		});
		return { kind: "success" };
	} catch (e) {
		if (e instanceof NetworkError) return { kind: "network-error" };
		return { kind: "business-error", message: e instanceof Error ? e.message : "Unknown error" };
	}
}

/** Same shape as attemptTopUp, for both legs of a transfer at once. */
export async function attemptTransfer(fromRow: LocalTransaction, toRow: LocalTransaction): Promise<AttemptResult> {
	try {
		const saved = await callFunction<{
			from: { balance: number; last_modified: string };
			to: { balance: number; last_modified: string };
			from_transaction: { last_modified: string };
			to_transaction: { last_modified: string };
		}>("transfer-account", {
			from_id: fromRow.account_id,
			to_id: toRow.account_id,
			amount: Math.abs(fromRow.amount),
			currency: fromRow.currency,
			description: fromRow.description,
			from_transaction_id: fromRow.id,
			to_transaction_id: toRow.id,
		});
		await db.transaction("rw", [db.accounts, db.transactions], async () => {
			await db.accounts.update(fromRow.account_id, { balance: saved.from.balance, last_modified: saved.from.last_modified, _synced: 1 });
			await db.accounts.update(toRow.account_id, { balance: saved.to.balance, last_modified: saved.to.last_modified, _synced: 1 });
			await db.transactions.update(fromRow.id, { last_modified: saved.from_transaction.last_modified, _synced: 1 });
			await db.transactions.update(toRow.id, { last_modified: saved.to_transaction.last_modified, _synced: 1 });
		});
		return { kind: "success" };
	} catch (e) {
		if (e instanceof NetworkError) return { kind: "network-error" };
		return { kind: "business-error", message: e instanceof Error ? e.message : "Unknown error" };
	}
}

async function rollbackPrediction(accountId: string, predictedId: string, balanceDelta: number): Promise<void> {
	const account = await db.accounts.get(accountId);
	await db.transaction("rw", [db.accounts, db.transactions], async () => {
		if (account) await db.accounts.update(accountId, { balance: account.balance + balanceDelta });
		await db.transactions.delete(predictedId);
	});
}

/** Optimistic top-up: predicts the new balance and a pending transaction
 * instantly (liveQuery picks them up immediately). If offline, the
 * prediction is left in place — pending, safe to retry later since the
 * RPC is idempotent on this row's own id — and this resolves normally so
 * the caller's dialog closes as though it worked. If online and the
 * server definitively rejects it (e.g. insufficient balance), the
 * prediction is rolled back entirely and the error is rethrown for the
 * caller's existing try/catch + notifyError UI. */
export async function topUpAccount(accountId: string, amount: number, currency: string, description?: string): Promise<void> {
	const predictedId = crypto.randomUUID();
	const now = new Date().toISOString();
	const account = await db.accounts.get(accountId);
	if (!account) throw new Error("Account not found locally");

	await db.transaction("rw", [db.accounts, db.transactions], async () => {
		await db.accounts.update(accountId, { balance: account.balance + amount });
		await db.transactions.put({
			id: predictedId,
			operation_id: predictedId,
			account_id: accountId,
			type: "TOP_UP",
			amount,
			currency,
			description: description ?? null,
			created_at: now,
			last_modified: now,
			_synced: 0,
		});
	});

	try {
		await ensureAccountSynced(accountId);
	} catch (e) {
		// Offline and the account itself hasn't synced yet either — nothing
		// to push against server-side. Leave everything queued; the account
		// creation retry (which runs first in pullAccounts) will unblock
		// this top-up's own retry once back online.
		if (e instanceof NetworkError) return;
		throw e;
	}

	const row = (await db.transactions.get(predictedId))!;
	const result = await attemptTopUp(row);
	if (result.kind === "business-error") {
		await rollbackPrediction(accountId, predictedId, -amount);
		throw new Error(result.message);
	}
	// network-error: queued for later — resolve normally.
	// success: attemptTopUp already reconciled.
}

/** Same optimistic-predict/attempt shape as topUpAccount, doubled up for
 * both sides of the transfer. */
export async function transferAccount(
	fromId: string,
	toId: string,
	amount: number,
	currency: string,
	description?: string,
): Promise<void> {
	const fromPredictedId = crypto.randomUUID();
	const toPredictedId = crypto.randomUUID();
	const operationId = crypto.randomUUID();
	const now = new Date().toISOString();
	const [fromAccount, toAccount] = await Promise.all([db.accounts.get(fromId), db.accounts.get(toId)]);
	if (!fromAccount || !toAccount) throw new Error("Account not found locally");

	await db.transaction("rw", [db.accounts, db.transactions], async () => {
		await db.accounts.update(fromId, { balance: fromAccount.balance - amount });
		await db.accounts.update(toId, { balance: toAccount.balance + amount });
		await db.transactions.put({
			id: fromPredictedId,
			operation_id: operationId,
			account_id: fromId,
			type: "TRANSFER",
			amount: -amount,
			currency,
			description: description ?? null,
			created_at: now,
			last_modified: now,
			_synced: 0,
		});
		await db.transactions.put({
			id: toPredictedId,
			operation_id: operationId,
			account_id: toId,
			type: "TRANSFER",
			amount,
			currency,
			description: description ?? null,
			created_at: now,
			last_modified: now,
			_synced: 0,
		});
	});

	try {
		await Promise.all([ensureAccountSynced(fromId), ensureAccountSynced(toId)]);
	} catch (e) {
		if (e instanceof NetworkError) return;
		throw e;
	}

	const [fromRow, toRow] = await Promise.all([db.transactions.get(fromPredictedId), db.transactions.get(toPredictedId)]);
	const result = await attemptTransfer(fromRow!, toRow!);
	if (result.kind === "business-error") {
		await db.transaction("rw", [db.accounts, db.transactions], async () => {
			await db.accounts.update(fromId, { balance: fromAccount.balance });
			await db.accounts.update(toId, { balance: toAccount.balance });
			await db.transactions.delete(fromPredictedId);
			await db.transactions.delete(toPredictedId);
		});
		throw new Error(result.message);
	}
}

/** Retries unsynced account writes (creation/deletion — both idempotent),
 * then pulls anything changed on the server since the local watermark.
 * Pending top-up/transfer/expense operations are handled separately by
 * local/ledger.ts's processPendingLedgerOps() (called from
 * stores/accounts.ts alongside this), not here — they need to be
 * processed in a single combined queue ordered by action timestamp across
 * both accounts.ts and expenses.ts operations, which doesn't fit this
 * function's single-entity scope. Called on init and by the
 * reconnect/interval reconciliation loop. */
export async function pullAccounts(userId: string): Promise<void> {
	const unsyncedAccounts = await db.accounts.where("_synced").equals(0).toArray();
	for (const row of unsyncedAccounts) {
		if (row.is_deleted) {
			await pushDelete(row.id).catch((e) => console.error("Account delete retry-sync failed:", e));
		} else {
			const transactionRow = await db.transactions.where("account_id").equals(row.id).and((t) => t.type === "CREATION").first();
			await pushAccount(row.id, transactionRow?.id ?? crypto.randomUUID()).catch((e) =>
				console.error("Account retry-sync failed:", e),
			);
		}
	}

	const syncedAccounts = await db.accounts.where("_synced").equals(1).sortBy("last_modified");
	const accountsSince = syncedAccounts.length > 0 ? syncedAccounts[syncedAccounts.length - 1].last_modified : "1970-01-01T00:00:00Z";

	const { data: accountRows, error: accountError } = await supabase
		.from("accounts")
		.select("id, name, icon, currency, balance, user_id, created_at, last_modified, is_deleted")
		.eq("user_id", userId)
		.gt("last_modified", accountsSince)
		.order("last_modified", { ascending: true });
	if (accountError) throw accountError;

	if (accountRows && accountRows.length > 0) {
		await db.accounts.bulkPut(
			accountRows.map((r) => ({
				id: r.id,
				name: r.name,
				icon: r.icon ?? "",
				currency: r.currency,
				balance: r.balance,
				user_id: r.user_id,
				created_at: r.created_at,
				last_modified: r.last_modified,
				is_deleted: r.is_deleted,
				_synced: 1 as const,
			})),
		);
	}

	// Pending (unconfirmed) rows are skipped here on purpose: a row that's
	// still `_synced: 0` either hasn't reached the server yet (pull would
	// find nothing new for it anyway) or is a permanently-errored one
	// local/ledger.ts left in place deliberately — either way, only
	// confirmed rows should anchor the watermark, matching accounts above.
	const syncedTransactions = await db.transactions.where("_synced").equals(1).sortBy("last_modified");
	const transactionsSince =
		syncedTransactions.length > 0 ? syncedTransactions[syncedTransactions.length - 1].last_modified : "1970-01-01T00:00:00Z";

	const { data: transactionRows, error: transactionError } = await supabase
		.from("transactions")
		.select("id, account_id, type, amount, currency, description, created_at, last_modified, accounts!inner(user_id)")
		.eq("accounts.user_id", userId)
		.gt("last_modified", transactionsSince)
		.order("last_modified", { ascending: true });
	if (transactionError) throw transactionError;

	if (transactionRows && transactionRows.length > 0) {
		await db.transactions.bulkPut(
			transactionRows.map((r) => ({
				id: r.id,
				operation_id: r.id,
				account_id: r.account_id,
				type: r.type,
				amount: r.amount,
				currency: r.currency,
				description: r.description,
				created_at: r.created_at,
				last_modified: r.last_modified,
				_synced: 1 as const,
			})),
		);
	}
}
