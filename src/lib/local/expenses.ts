import { db, type LocalTransaction } from "$lib/db";
import { supabase } from "$lib/supabase";
import { callFunction, NetworkError } from "$lib/api";
import { liveQueryStore } from "$lib/local/liveQueryStore";
import { ensurePayeeSynced } from "$lib/local/payees";
import { ensureAccountSynced, type AttemptResult } from "$lib/local/accounts";
import { uuid } from "$lib/uuid";

export interface Expense {
	id: string;
	amount: number;
	date: string;
	label: string;
	accountId: string;
	currency: string;
	createdAt: string;
	payeeId: string | null;
	payeeLabel: string | null;
	payeeIcon: string | null;
	tags: { id: string; value: string }[];
	pending: boolean;
	error?: string;
}

export interface CreateExpenseInput {
	account_id: string;
	amount: number;
	label: string;
	date: string;
	payee_id?: string;
	payee_label?: string;
}

/** Same session-race fix as observePayees()/observeAccounts(). Joins the
 * local expenseDetails/transactions/payees/expensesTags/tags tables — a
 * novel payee's label is carried on the optimistic expenseDetails row
 * itself (`novel_payee_label`) rather than a premature `payees` row, so it
 * never collides with pullPayees()'s generic "retry any unsynced payee"
 * loop (which has no idea a given unsynced payee exists only as an
 * expense-creation side effect). */
export function observeExpenses() {
	return liveQueryStore(async () => {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		const userId = session?.user.id;

		const [expenseDetails, transactions, payees, expensesTags, tags] = await Promise.all([
			db.expenseDetails.toArray(),
			db.transactions.toArray(),
			db.payees.toArray(),
			db.expensesTags.toArray(),
			db.tags.toArray(),
		]);

		const transactionById = new Map(transactions.map((t) => [t.id, t]));
		const payeeById = new Map(payees.map((p) => [p.id, p]));
		const tagById = new Map(tags.map((t) => [t.id, t]));
		const tagIdsByExpense = new Map<string, string[]>();
		for (const link of expensesTags) {
			const list = tagIdsByExpense.get(link.expense_id) ?? [];
			list.push(link.tag_id);
			tagIdsByExpense.set(link.expense_id, list);
		}

		return expenseDetails
			.filter((e) => e.user_id === userId)
			.map((e): Expense | null => {
				const transaction = transactionById.get(e.transaction_id);
				if (!transaction) return null;
				const payee = e.payee_id ? payeeById.get(e.payee_id) : undefined;
				return {
					id: e.id,
					amount: Math.abs(transaction.amount),
					label: e.label,
					date: e.date,
					accountId: transaction.account_id,
					currency: transaction.currency,
					createdAt: transaction.created_at,
					payeeId: e.payee_id,
					payeeLabel: payee?.label ?? e.novel_payee_label ?? null,
					payeeIcon: payee?.icon ?? (e.novel_payee_label ? "store" : null),
					tags: (tagIdsByExpense.get(e.id) ?? [])
						.map((id) => tagById.get(id))
						.filter((t): t is (typeof tags)[number] => t !== undefined && !t.is_deleted)
						.map((t) => ({ id: t.id, value: t.value })),
					pending: e._synced === 0 && !e._error,
					error: e._error,
				};
			})
			.filter((e): e is Expense => e !== null)
			.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
	}, [] as Expense[]);
}

/** Pure "try the network call, reconcile on success" for one already-
 * recorded expense prediction — same shape and same reasoning as
 * attemptTopUp/attemptTransfer in local/accounts.ts (create-expense is
 * idempotent on `transactionRow.id`/the paired expense's id, per
 * 00047_ledger_idempotent_retry.sql). No side effects on failure; the
 * caller decides what a failure means. Exported for local/ledger.ts. */
export async function attemptExpense(transactionRow: LocalTransaction): Promise<AttemptResult> {
	const expenseRow = await db.expenseDetails.where("transaction_id").equals(transactionRow.id).first();
	if (!expenseRow) return { kind: "business-error", message: "Expense record missing locally" };

	const pendingLinks = await db.expensesTags.where("expense_id").equals(expenseRow.id).toArray();

	try {
		const saved = await callFunction<{
			expense: { id: string; user_id: string; label: string; date: string; payee_id: string | null; last_modified: string };
			transaction: { id: string; last_modified: string };
			tag_ids: string[];
		}>("create-expense", {
			account_id: transactionRow.account_id,
			amount: Math.abs(transactionRow.amount),
			label: expenseRow.label,
			date: expenseRow.date,
			payee_id: expenseRow.payee_id ?? null,
			payee_label: expenseRow.novel_payee_label ?? null,
			transaction_id: transactionRow.id,
			expense_id: expenseRow.id,
		});

		await db.transaction("rw", [db.transactions, db.expenseDetails, db.expensesTags], async () => {
			await db.transactions.update(transactionRow.id, { last_modified: saved.transaction.last_modified, _synced: 1 });
			await db.expenseDetails.update(expenseRow.id, {
				payee_id: saved.expense.payee_id,
				novel_payee_label: undefined,
				last_modified: saved.expense.last_modified,
				_synced: 1,
			});
			for (const link of pendingLinks) {
				await db.expensesTags.delete([expenseRow.id, link.tag_id]);
			}
			for (const tagId of saved.tag_ids) {
				await db.expensesTags.put({ expense_id: expenseRow.id, tag_id: tagId, last_modified: saved.expense.last_modified, _synced: 1 });
			}
		});
		return { kind: "success" };
	} catch (e) {
		if (e instanceof NetworkError) return { kind: "network-error" };
		return { kind: "business-error", message: e instanceof Error ? e.message : "Unknown error" };
	}
}

/** Optimistic expense creation: predicts the account debit, the expense
 * itself, and (for an existing payee) its tag pills instantly. If offline,
 * the prediction is left in place — pending, safe to retry later since
 * create-expense is idempotent on this row's own id — and this resolves
 * normally so the caller's dialog closes as though it worked. If online
 * and the server definitively rejects it, every optimistic write is rolled
 * back and the error is rethrown for the caller's existing try/catch +
 * notifyError UI. */
export async function createExpense(input: CreateExpenseInput, userId: string): Promise<void> {
	const predictedTransactionId = uuid();
	const predictedExpenseId = uuid();
	const now = new Date().toISOString();
	const currency = "PHP"; // create-expense has never taken the debited account's own currency — matched as-is, not fixed here.

	const account = await db.accounts.get(input.account_id);
	if (!account) throw new Error("Account not found locally");

	let predictedTagLinks: { tag_id: string }[] = [];
	if (input.payee_id) {
		const links = await db.payeesTags.where("payee_id").equals(input.payee_id).toArray();
		predictedTagLinks = links.map((l) => ({ tag_id: l.tag_id }));
	}

	await db.transaction("rw", [db.transactions, db.expenseDetails, db.expensesTags], async () => {
		await db.transactions.put({
			id: predictedTransactionId,
			operation_id: predictedTransactionId,
			account_id: input.account_id,
			type: "EXPENSE",
			amount: -input.amount,
			currency,
			description: null,
			created_at: now,
			last_modified: now,
			_synced: 0,
		});
		await db.expenseDetails.put({
			id: predictedExpenseId,
			user_id: userId,
			label: input.label,
			date: input.date,
			transaction_id: predictedTransactionId,
			payee_id: input.payee_id ?? null,
			novel_payee_label: input.payee_id ? undefined : input.payee_label,
			last_modified: now,
			_synced: 0,
		});
		for (const link of predictedTagLinks) {
			await db.expensesTags.put({ expense_id: predictedExpenseId, tag_id: link.tag_id, last_modified: now, _synced: 0 });
		}
	});

	try {
		await ensureAccountSynced(input.account_id);
		if (input.payee_id) await ensurePayeeSynced(input.payee_id);
	} catch (e) {
		// Offline and the account or payee itself hasn't synced yet — nothing
		// to push against server-side. Leave everything queued; those
		// retries (which run first) unblock this expense's own retry once
		// back online.
		if (e instanceof NetworkError) return;
		throw e;
	}

	const transactionRow = (await db.transactions.get(predictedTransactionId))!;
	const result = await attemptExpense(transactionRow);
	if (result.kind === "business-error") {
		// Marked, not deleted — same terminal _error state local/ledger.ts
		// uses for a rejected offline retry, so a rejected expense (and its
		// tags) stays visible for review instead of vanishing without a
		// trace. Excluded from the balance fold like any other errored row.
		await db.transaction("rw", [db.transactions, db.expenseDetails], async () => {
			await db.transactions.update(predictedTransactionId, { _error: result.message });
			await db.expenseDetails.update(predictedExpenseId, { _error: result.message });
		});
		throw new Error(result.message);
	}
	// network-error: queued for later — resolve normally.
	// success: attemptExpense already reconciled.
}

/** Pulls anything changed on the server since the local watermark. Pending
 * expense creations are retried separately by local/ledger.ts's
 * processPendingLedgerOps() (called from stores/accounts.ts, which owns
 * the combined action-timestamp-ordered queue across accounts.ts and
 * expenses.ts operations), not here. Called on init and by the
 * reconnect/interval reconciliation loop. */
export async function pullExpenses(userId: string): Promise<void> {
	const syncedExpenses = await db.expenseDetails.where("_synced").equals(1).sortBy("last_modified");
	const expensesSince = syncedExpenses.length > 0 ? syncedExpenses[syncedExpenses.length - 1].last_modified : "1970-01-01T00:00:00Z";

	const { data: expenseRows, error: expenseError } = await supabase
		.from("expense_details")
		.select("id, user_id, label, date, transaction_id, payee_id, last_modified")
		.eq("user_id", userId)
		.gt("last_modified", expensesSince)
		.order("last_modified", { ascending: true });
	if (expenseError) throw expenseError;

	if (expenseRows && expenseRows.length > 0) {
		await db.expenseDetails.bulkPut(
			expenseRows.map((r) => ({
				id: r.id,
				user_id: r.user_id,
				label: r.label,
				date: r.date,
				transaction_id: r.transaction_id,
				payee_id: r.payee_id,
				last_modified: r.last_modified,
				_synced: 1 as const,
			})),
		);
	}

	// expenses_tags has no user_id of its own — pull by joining through
	// expense_details, same ownership rule RLS already enforces server-side
	// (mirrors payees_tags in local/payees.ts).
	const syncedLinks = await db.expensesTags.where("_synced").equals(1).sortBy("last_modified");
	const linksSince = syncedLinks.length > 0 ? syncedLinks[syncedLinks.length - 1].last_modified : "1970-01-01T00:00:00Z";

	const { data: linkRows, error: linkError } = await supabase
		.from("expenses_tags")
		.select("expense_id, tag_id, last_modified, expense_details!inner(user_id)")
		.eq("expense_details.user_id", userId)
		.gt("last_modified", linksSince)
		.order("last_modified", { ascending: true });
	if (linkError) throw linkError;

	if (linkRows && linkRows.length > 0) {
		await db.expensesTags.bulkPut(
			linkRows.map((r) => ({
				expense_id: r.expense_id,
				tag_id: r.tag_id,
				last_modified: r.last_modified,
				_synced: 1 as const,
			})),
		);
	}
}
