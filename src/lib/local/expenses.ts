import { db } from "$lib/db";
import { supabase } from "$lib/supabase";
import { callFunction } from "$lib/api";
import { liveQueryStore } from "$lib/local/liveQueryStore";
import { ensurePayeeSynced } from "$lib/local/payees";
import { ensureAccountSynced } from "$lib/local/accounts";

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
				};
			})
			.filter((e): e is Expense => e !== null)
			.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
	}, [] as Expense[]);
}

/** Optimistic expense creation: predicts the account debit, the expense
 * itself, and (for an existing payee) its tag pills instantly, then awaits
 * the real create-expense call — still fully server-authoritative, since
 * it both moves money and can atomically create a brand-new payee, so
 * (like topUpAccount/transferAccount) it is never fire-and-forget or
 * reconnect-retried. Reconciles onto the server's real ids on success, or
 * rolls every optimistic write back on failure. */
export async function createExpense(input: CreateExpenseInput, userId: string): Promise<void> {
	await ensureAccountSynced(input.account_id);
	if (input.payee_id) await ensurePayeeSynced(input.payee_id);

	const predictedTransactionId = crypto.randomUUID();
	const predictedExpenseId = crypto.randomUUID();
	const now = new Date().toISOString();
	const currency = "PHP"; // create-expense has never taken the debited account's own currency — matched as-is, not fixed here.

	const account = await db.accounts.get(input.account_id);
	if (!account) throw new Error("Account not found locally");

	let predictedTagLinks: { tag_id: string }[] = [];
	if (input.payee_id) {
		const links = await db.payeesTags.where("payee_id").equals(input.payee_id).toArray();
		predictedTagLinks = links.map((l) => ({ tag_id: l.tag_id }));
	}

	await db.transaction("rw", [db.accounts, db.transactions, db.expenseDetails, db.expensesTags], async () => {
		await db.accounts.update(input.account_id, { balance: account.balance - input.amount });
		await db.transactions.put({
			id: predictedTransactionId,
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
		const saved = await callFunction<{
			expense: { id: string; user_id: string; label: string; date: string; payee_id: string | null; last_modified: string };
			transaction: { id: string; amount: number; currency: string; created_at: string; last_modified: string };
			account: { balance: number; last_modified: string };
			tag_ids: string[];
		}>("create-expense", {
			account_id: input.account_id,
			amount: input.amount,
			label: input.label,
			date: input.date,
			payee_id: input.payee_id ?? null,
			payee_label: input.payee_label ?? null,
		});

		await db.transaction("rw", [db.accounts, db.transactions, db.expenseDetails, db.expensesTags], async () => {
			await db.accounts.update(input.account_id, { balance: saved.account.balance, last_modified: saved.account.last_modified, _synced: 1 });

			await db.transactions.delete(predictedTransactionId);
			await db.transactions.put({
				id: saved.transaction.id,
				account_id: input.account_id,
				type: "EXPENSE",
				amount: saved.transaction.amount,
				currency: saved.transaction.currency,
				description: null,
				created_at: saved.transaction.created_at,
				last_modified: saved.transaction.last_modified,
				_synced: 1,
			});

			await db.expenseDetails.delete(predictedExpenseId);
			await db.expenseDetails.put({
				id: saved.expense.id,
				user_id: saved.expense.user_id,
				label: saved.expense.label,
				date: saved.expense.date,
				transaction_id: saved.transaction.id,
				payee_id: saved.expense.payee_id,
				last_modified: saved.expense.last_modified,
				_synced: 1,
			});

			for (const link of predictedTagLinks) {
				await db.expensesTags.delete([predictedExpenseId, link.tag_id]);
			}
			for (const tagId of saved.tag_ids) {
				await db.expensesTags.put({ expense_id: saved.expense.id, tag_id: tagId, last_modified: saved.expense.last_modified, _synced: 1 });
			}
		});
	} catch (e) {
		await db.transaction("rw", [db.accounts, db.transactions, db.expenseDetails, db.expensesTags], async () => {
			await db.accounts.update(input.account_id, { balance: account.balance });
			await db.transactions.delete(predictedTransactionId);
			await db.expenseDetails.delete(predictedExpenseId);
			for (const link of predictedTagLinks) {
				await db.expensesTags.delete([predictedExpenseId, link.tag_id]);
			}
		});
		throw e;
	}
}

/** Discards any leftover expense predictions from a session that ended
 * mid-request (same reasoning as accounts.ts's stale TOP_UP/TRANSFER
 * predictions: outcome unknown, so undo the local guess and let the pull
 * below bring in the truth either way), then pulls anything changed on the
 * server since the local watermark. Called on init and by the
 * reconnect/interval reconciliation loop. */
export async function pullExpenses(userId: string): Promise<void> {
	const stalePredictions = await db.expenseDetails.where("_synced").equals(0).toArray();
	for (const row of stalePredictions) {
		const transaction = await db.transactions.get(row.transaction_id);
		if (transaction) {
			const account = await db.accounts.get(transaction.account_id);
			if (account) await db.accounts.update(transaction.account_id, { balance: account.balance - transaction.amount });
			await db.transactions.delete(transaction.id);
		}
		await db.expensesTags.where("expense_id").equals(row.id).delete();
		await db.expenseDetails.delete(row.id);
	}

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
