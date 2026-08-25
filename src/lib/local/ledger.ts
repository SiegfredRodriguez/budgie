import { db, type LocalTransaction } from "$lib/db";
import { attemptTopUp, attemptTransfer } from "$lib/local/accounts";
import { attemptExpense } from "$lib/local/expenses";
import { notifyError } from "$lib/stores/snackbar";

/**
 * Retries every queued-offline money-moving operation — top-ups,
 * transfers, and expense creations — in the order they were actually
 * performed (`created_at`, the client-recorded action timestamp; not
 * insertion order, which can differ once retries and reconciliation are in
 * the mix), one operation at a time, awaiting each before starting the
 * next.
 *
 * Money operations are inherently sequential: pushing them out of order
 * could make a legitimately-fine sequence spuriously fail server-side (or
 * the reverse), since each one's balance check depends on the ones before
 * it having actually landed. A NetworkError stops the whole pass — still
 * offline, nothing further will succeed either, so there's no point
 * burning through the rest of the queue only to fail the same way. A
 * definitive server rejection instead permanently marks just that one
 * operation as failed (reversing its optimistic balance impact and
 * recording the reason) and moves on to the rest.
 *
 * Called from stores/accounts.ts alongside pullAccounts()/pullExpenses(),
 * not from local/accounts.ts or local/expenses.ts directly — a top-up and
 * an expense can be queued back to back, and only something that already
 * depends on both modules (as this does) can order them together.
 */
export async function processPendingLedgerOps(): Promise<void> {
	const pending = await db.transactions
		.where("_synced")
		.equals(0)
		.and((t) => !t._error)
		.toArray();
	if (pending.length === 0) return;

	const groups = new Map<string, LocalTransaction[]>();
	for (const row of pending) {
		const list = groups.get(row.operation_id) ?? [];
		list.push(row);
		groups.set(row.operation_id, list);
	}

	const ordered = [...groups.values()].sort(
		(a, b) => new Date(earliestCreatedAt(a)).getTime() - new Date(earliestCreatedAt(b)).getTime(),
	);

	for (const rows of ordered) {
		const type = rows[0].type;
		const result =
			type === "TOP_UP"
				? await attemptTopUp(rows[0])
				: type === "TRANSFER"
					? await attemptTransferPair(rows)
					: type === "EXPENSE"
						? await attemptExpense(rows[0])
						: undefined;

		if (!result) continue; // unrecognized type — shouldn't happen, skip rather than block the queue

		if (result.kind === "network-error") return; // still offline — stop here, retry the whole pass next time

		if (result.kind === "business-error") {
			await markOperationError(rows, result.message);
			notifyError(`A queued ${describeType(type)} could not be completed: ${result.message}`);
		}
		// success or business-error: continue on to the next queued operation
	}
}

function earliestCreatedAt(rows: LocalTransaction[]): string {
	return rows.reduce((earliest, r) => (r.created_at < earliest ? r.created_at : earliest), rows[0].created_at);
}

function describeType(type: string): string {
	if (type === "TOP_UP") return "top-up";
	if (type === "TRANSFER") return "transfer";
	if (type === "EXPENSE") return "expense";
	return type.toLowerCase();
}

async function attemptTransferPair(rows: LocalTransaction[]) {
	const fromRow = rows.find((r) => r.amount < 0);
	const toRow = rows.find((r) => r.amount > 0);
	if (!fromRow || !toRow) {
		return { kind: "business-error" as const, message: "Transfer record incomplete locally" };
	}
	return attemptTransfer(fromRow, toRow);
}

/** Reverses each row's optimistic balance impact (the server never applied
 * it) and marks it permanently failed — `_synced` stays 0 so it's never
 * mistaken for confirmed, but `_error` being set excludes it from every
 * future retry pass. For an EXPENSE operation, also marks the paired
 * LocalExpenseDetail row so the UI can show the failure without a second
 * lookup. */
async function markOperationError(rows: LocalTransaction[], message: string): Promise<void> {
	await db.transaction("rw", [db.accounts, db.transactions, db.expenseDetails], async () => {
		for (const row of rows) {
			const account = await db.accounts.get(row.account_id);
			if (account) await db.accounts.update(row.account_id, { balance: account.balance - row.amount });
			await db.transactions.update(row.id, { _error: message });
		}
		if (rows[0].type === "EXPENSE") {
			const expenseRow = await db.expenseDetails.where("transaction_id").equals(rows[0].id).first();
			if (expenseRow) await db.expenseDetails.update(expenseRow.id, { _error: message });
		}
	});
}
