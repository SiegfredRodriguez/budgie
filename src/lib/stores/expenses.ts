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
}

const initial: Expense[] = [];

export const expenses = writable<Expense[]>(initial);
export const expensesLoading = writable(false);

function mapRow(t: any): Expense {
	return {
		id: t.expense_details.id,
		amount: Math.abs(t.amount),
		label: t.expense_details.label,
		date: t.expense_details.date,
		accountId: t.account_id,
		currency: t.currency,
		createdAt: t.created_at,
	};
}

export async function loadExpenses() {
	expensesLoading.set(true);
	try {
		const { data, error } = await supabase
			.from('transactions')
			.select('amount, currency, account_id, created_at, expense_details!inner(id, label, date)')
			.eq('type', 'EXPENSE');
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
