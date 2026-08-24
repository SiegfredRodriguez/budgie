import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { callFunction } from '$lib/api';
import { notifyError } from './snackbar';
import { accountsReady } from './init';
import type { AccountRow } from '$lib/types/db';

export interface Account {
	id: string;
	icon: string;
	label: string;
	currency: string;
	balance: number;
}

const initial: Account[] = [];

export const accounts = writable<Account[]>(initial);
export const accountsLoading = writable(false);

function mapRow(r: AccountRow): Account {
	return { id: r.id, icon: r.icon, label: r.name, currency: r.currency, balance: r.balance };
}

export async function loadAccounts() {
	accountsLoading.set(true);
	try {
		const { data, error } = await supabase
			.from('accounts')
			.select('id,name,icon,currency,balance')
			.order('created_at', { ascending: true });
		if (error) return;
		accounts.set((data ?? []).map(mapRow));
	} finally {
		accountsLoading.set(false);
	}
}

let sub: Awaited<ReturnType<typeof supabase.channel>> | undefined;

function subscribeAccounts() {
	if (sub) return;
	sub = supabase
		.channel('accounts-changes')
		.on(
			'postgres_changes',
			{ event: '*', schema: 'public', table: 'accounts' },
			(payload: RealtimePostgresChangesPayload<AccountRow>) => {
				if (payload.eventType === 'INSERT') {
					accounts.update((current) => [...current, mapRow(payload.new)]);
				} else if (payload.eventType === 'UPDATE') {
					accounts.update((current) => current.map((a) => (a.id === payload.new.id ? mapRow(payload.new) : a)));
				} else if (payload.eventType === 'DELETE') {
					accounts.update((current) => current.filter((a) => a.id !== payload.old.id));
				}
			},
		)
		.subscribe();
}

export function unsubscribeAccounts() {
	sub?.unsubscribe();
	sub = undefined;
}

export async function initAccounts() {
	subscribeAccounts();
	try {
		await loadAccounts();
	} catch (e) {
		console.error('Failed to load accounts', e);
		notifyError('Failed to load accounts');
	}
	accountsReady.set(true);
}

export async function addAccount(account: Omit<Account, 'id'>) {
	const raw = await callFunction<AccountRow>('create-account', {
		name: account.label,
		icon: account.icon,
		currency: account.currency,
		balance: account.balance,
	});
	return mapRow(raw);
}

export async function deleteAccount(id: string) {
	const { error } = await supabase.from('accounts').delete().eq('id', id);
	if (error) throw new Error(error.message);
}

export async function topUpAccount(id: string, amount: number, currency: string) {
	await callFunction('top-up-account', {
		account_id: id,
		amount,
		currency,
	});
}

export async function transferAccount(fromId: string, toId: string, amount: number, currency: string) {
	await callFunction('transfer-account', {
		from_id: fromId,
		to_id: toId,
		amount,
		currency,
	});
}
