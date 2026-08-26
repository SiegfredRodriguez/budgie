import { writable } from "svelte/store";
import { supabase } from "$lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { db } from "$lib/db";
import { createExpense as createExpenseLocal, pullExpenses, type CreateExpenseInput } from "$lib/local/expenses";
import { scheduleReconciliation } from "$lib/local/sync";
import { notifyError } from "./snackbar";
import { expensesReady } from "./init";

export const expensesLoading = writable(false);

let currentUserId: string | undefined;

/** `transactions` Realtime/pull already flows into Dexie via
 * stores/accounts.ts's subscription (it covers every transaction type,
 * not just account-ledger ones) — an EXPENSE-type row lands the same way.
 * This wrapper only needs to resolve the caller's userId and delegate. */
export async function createExpense(input: CreateExpenseInput) {
	if (!currentUserId) throw new Error("Not signed in");
	await createExpenseLocal(input, currentUserId);
}

let sub: Awaited<ReturnType<typeof supabase.channel>> | undefined;
let stopReconciliation: (() => void) | undefined;

interface ExpenseDetailRealtimeRow {
	id: string;
	user_id: string;
	label: string;
	date: string;
	transaction_id: string;
	payee_id: string | null;
	last_modified: string;
}

interface ExpenseTagRealtimeRow {
	expense_id: string;
	tag_id: string;
	last_modified: string;
}

function subscribeExpenses() {
	if (sub) return;
	sub = supabase
		.channel("expenses-changes")
		.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: "expense_details" },
			(payload: RealtimePostgresChangesPayload<ExpenseDetailRealtimeRow>) => {
				if (payload.eventType === "DELETE") {
					db.expenseDetails.delete(payload.old.id as string);
					return;
				}
				const row = payload.new;
				db.expenseDetails.put({
					id: row.id,
					user_id: row.user_id,
					label: row.label,
					date: row.date,
					transaction_id: row.transaction_id,
					payee_id: row.payee_id,
					last_modified: row.last_modified,
					_synced: 1,
				});
			},
		)
		.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: "expenses_tags" },
			(payload: RealtimePostgresChangesPayload<ExpenseTagRealtimeRow>) => {
				if (payload.eventType === "DELETE") {
					db.expensesTags.delete([payload.old.expense_id as string, payload.old.tag_id as string]);
					return;
				}
				const row = payload.new;
				db.expensesTags.put({ expense_id: row.expense_id, tag_id: row.tag_id, last_modified: row.last_modified, _synced: 1 });
			},
		)
		.subscribe();
}

export function unsubscribeExpenses() {
	sub?.unsubscribe();
	sub = undefined;
	stopReconciliation?.();
	stopReconciliation = undefined;
}

export async function initExpenses() {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session) {
		expensesReady.set(true);
		return;
	}
	currentUserId = session.user.id;

	subscribeExpenses();
	expensesLoading.set(true);
	try {
		await pullExpenses(currentUserId);
	} catch (e) {
		console.error("Failed to load expenses", e);
		notifyError("Failed to load expenses");
	} finally {
		expensesLoading.set(false);
	}
	stopReconciliation = scheduleReconciliation(() => {
		if (currentUserId) pullExpenses(currentUserId).catch((e) => console.error("Expense reconciliation failed", e));
	});
	expensesReady.set(true);
}
