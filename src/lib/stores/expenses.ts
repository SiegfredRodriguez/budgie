import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';
import { expensesReady } from './init';

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

function mapRow(t: any): Expense {
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
		tags: (t.expense_tags ?? []).map((et: any) => et.tag).filter(Boolean),
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
		expenses.set(
			data.map(mapRow).sort((a, b) => {
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
	}
	expensesReady.set(true);
}
