import { db, type LocalTransaction } from "$lib/db";
import { supabase } from "$lib/supabase";
import { callFunction } from "$lib/api";
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
}

function toAccount(r: { id: string; name: string; icon: string; currency: string; balance: number }): Account {
	return { id: r.id, label: r.name, icon: r.icon, currency: r.currency, balance: r.balance };
}

function toTransaction(r: LocalTransaction): Transaction {
	return { id: r.id, type: r.type, amount: r.amount, currency: r.currency, description: r.description, created_at: r.created_at };
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
 * Mirrors ensureTagSynced/ensurePayeeSynced. */
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

/** Optimistic top-up: predicts the new balance and a pending transaction
 * instantly (liveQuery picks them up immediately), then awaits the real
 * (still server-authoritative, still fully pessimistic in the sense that
 * calling it twice really adds money twice) top-up-account call. On
 * success the prediction is replaced with the server's real row; on
 * failure it's rolled back and the error rethrown for the caller's existing
 * try/catch + notifyError UI. Deliberately not fire-and-forget or
 * reconnect-retried, unlike tags/payees/account-creation — see
 * LocalTransaction's doc comment for why. */
export async function topUpAccount(accountId: string, amount: number, currency: string, description?: string): Promise<void> {
	await ensureAccountSynced(accountId);

	const predictedId = crypto.randomUUID();
	const now = new Date().toISOString();
	const account = await db.accounts.get(accountId);
	if (!account) throw new Error("Account not found locally");

	await db.transaction("rw", [db.accounts, db.transactions], async () => {
		await db.accounts.update(accountId, { balance: account.balance + amount });
		await db.transactions.put({
			id: predictedId,
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
		const saved = await callFunction<{
			account: { balance: number; last_modified: string };
			transaction: { id: string; amount: number; currency: string; description: string | null; created_at: string; last_modified: string };
		}>("top-up-account", { account_id: accountId, amount, currency, description });

		await db.transaction("rw", [db.accounts, db.transactions], async () => {
			await db.accounts.update(accountId, { balance: saved.account.balance, last_modified: saved.account.last_modified, _synced: 1 });
			await db.transactions.delete(predictedId);
			// Keyed by the server's real transaction id (not predictedId): a
			// duplicate row would sit alongside this one once Realtime/pull
			// later delivers that same id, since they'd otherwise never merge.
			await db.transactions.put({
				id: saved.transaction.id,
				account_id: accountId,
				type: "TOP_UP",
				amount: saved.transaction.amount,
				currency: saved.transaction.currency,
				description: saved.transaction.description,
				created_at: saved.transaction.created_at,
				last_modified: saved.transaction.last_modified,
				_synced: 1,
			});
		});
	} catch (e) {
		await rollbackPrediction(accountId, predictedId, -amount);
		throw e;
	}
}

async function rollbackPrediction(accountId: string, predictedId: string, balanceDelta: number): Promise<void> {
	const account = await db.accounts.get(accountId);
	await db.transaction("rw", [db.accounts, db.transactions], async () => {
		if (account) await db.accounts.update(accountId, { balance: account.balance + balanceDelta });
		await db.transactions.delete(predictedId);
	});
}

/** Same optimistic-predict/await/reconcile-or-rollback shape as topUpAccount,
 * doubled up for both sides of the transfer. */
export async function transferAccount(
	fromId: string,
	toId: string,
	amount: number,
	currency: string,
	description?: string,
): Promise<void> {
	await Promise.all([ensureAccountSynced(fromId), ensureAccountSynced(toId)]);

	const fromPredictedId = crypto.randomUUID();
	const toPredictedId = crypto.randomUUID();
	const now = new Date().toISOString();
	const [fromAccount, toAccount] = await Promise.all([db.accounts.get(fromId), db.accounts.get(toId)]);
	if (!fromAccount || !toAccount) throw new Error("Account not found locally");

	await db.transaction("rw", [db.accounts, db.transactions], async () => {
		await db.accounts.update(fromId, { balance: fromAccount.balance - amount });
		await db.accounts.update(toId, { balance: toAccount.balance + amount });
		await db.transactions.put({
			id: fromPredictedId,
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

	type SavedSide = { id: string; amount: number; currency: string; description: string | null; created_at: string; last_modified: string };
	try {
		const saved = await callFunction<{
			from: { balance: number; last_modified: string };
			to: { balance: number; last_modified: string };
			from_transaction: SavedSide;
			to_transaction: SavedSide;
		}>("transfer-account", { from_id: fromId, to_id: toId, amount, currency, description });

		await db.transaction("rw", [db.accounts, db.transactions], async () => {
			await db.accounts.update(fromId, { balance: saved.from.balance, last_modified: saved.from.last_modified, _synced: 1 });
			await db.accounts.update(toId, { balance: saved.to.balance, last_modified: saved.to.last_modified, _synced: 1 });
			await db.transactions.delete(fromPredictedId);
			await db.transactions.delete(toPredictedId);
			// Keyed by the server's real transaction ids, same reasoning as
			// topUpAccount's reconcile step.
			await db.transactions.put({
				id: saved.from_transaction.id,
				account_id: fromId,
				type: "TRANSFER",
				amount: saved.from_transaction.amount,
				currency: saved.from_transaction.currency,
				description: saved.from_transaction.description,
				created_at: saved.from_transaction.created_at,
				last_modified: saved.from_transaction.last_modified,
				_synced: 1,
			});
			await db.transactions.put({
				id: saved.to_transaction.id,
				account_id: toId,
				type: "TRANSFER",
				amount: saved.to_transaction.amount,
				currency: saved.to_transaction.currency,
				description: saved.to_transaction.description,
				created_at: saved.to_transaction.created_at,
				last_modified: saved.to_transaction.last_modified,
				_synced: 1,
			});
		});
	} catch (e) {
		await db.transaction("rw", [db.accounts, db.transactions], async () => {
			await db.accounts.update(fromId, { balance: fromAccount.balance });
			await db.accounts.update(toId, { balance: toAccount.balance });
			await db.transactions.delete(fromPredictedId);
			await db.transactions.delete(toPredictedId);
		});
		throw e;
	}
}

/** Retries unsynced account writes (creation/deletion — both idempotent),
 * discards any leftover top-up/transfer predictions from a session that
 * ended mid-request (their outcome is genuinely unknown; deleting the guess
 * and letting the incremental pull below bring in the truth, whichever way
 * it went, is the only safe move), then pulls anything changed on the
 * server since the local watermark. Called on init and by the
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

	const stalePredictions = await db.transactions.where("_synced").equals(0).toArray();
	for (const row of stalePredictions) {
		const account = await db.accounts.get(row.account_id);
		if (account) await db.accounts.update(row.account_id, { balance: account.balance - row.amount });
		await db.transactions.delete(row.id);
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
