import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';
import { notifyError } from './snackbar';
import { expensesReady } from './init';
import type { ExpenseDetailRow } from '$lib/types/db';

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

const initial: Expense[] = [];

export const expenses = writable<Expense[]>(initial);
export const expensesLoading = writable(false);

function mapRow(t: ExpenseDetailRow): Expense {
	return {
		id: t.id,
		amount: Math.abs(t.transaction.amount),
		label: t.label,
		date: t.date,
		accountId: t.transaction.account_id,
		currency: t.transaction.currency,
		createdAt: t.transaction.created_at,
		payeeId: t.payee?.id ?? null,
		payeeLabel: t.payee?.label ?? null,
		payeeIcon: t.payee?.icon ?? null,
		tags: t.expense_tags.map((et) => et.tag).filter((tag): tag is Exclude<typeof tag, null> => tag !== null),
	};
}

export async function loadExpenses() {
	expensesLoading.set(true);
	try {
		const { data, error } = await supabase
			.from('expense_details')
			.select('id, label, date, payee:payee_id(id, label, icon), expense_tags:expenses_tags!expense_id(tag:tag_id(id, value)), transaction:transaction_id!inner(amount, currency, account_id, created_at)')
			.eq('transaction.type', 'EXPENSE');
		if (error || !data) return;
		// Cast rather than trust inference here: with no generated Database
		// type, the client can't tell these embedded resources are one-to-one
		// joins and infers them as arrays, which doesn't match the single
		// objects Postgres actually returns for this query at runtime.
		const rows = data as unknown as ExpenseDetailRow[];
		expenses.set(
			rows.map(mapRow).sort((a, b) => {
				const dateCmp = b.date.localeCompare(a.date);
				if (dateCmp !== 0) return dateCmp;
				return b.createdAt.localeCompare(a.createdAt);
			}),
		);
	} finally {
		expensesLoading.set(false);
	}
}

let sub: Awaited<ReturnType<typeof supabase.channel>> | undefined;

export function subscribeExpenses() {
	if (sub) return;
	sub = supabase
		.channel('expenses-changes')
		.on(
			'postgres_changes',
			{ event: '*', schema: 'public', table: 'transactions', filter: 'type=eq.EXPENSE' },
			// Full refetch rather than patching the store in place, unlike the
			// tags/payees stores: an Expense needs joined payee and tag data
			// that a raw `transactions` realtime payload doesn't carry.
			() => loadExpenses(),
		)
		.subscribe();
}

export function unsubscribeExpenses() {
	sub?.unsubscribe();
	sub = undefined;
}

export async function initExpenses() {
	subscribeExpenses();
	try {
		await loadExpenses();
	} catch (e) {
		console.error('Failed to load expenses', e);
		notifyError('Failed to load expenses');
	}
	expensesReady.set(true);
}
