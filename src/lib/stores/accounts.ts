import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

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

function mapRow(r: any): Account {
	return { id: r.id, icon: r.icon, label: r.name, currency: r.currency, balance: r.balance };
}

export async function loadAccounts() {
	accountsLoading.set(true);
	const { data, error } = await supabase
		.from('accounts')
		.select('id,name,icon,currency,balance')
		.order('created_at', { ascending: true });
	if (error) { accountsLoading.set(false); return; }
	accounts.set((data ?? []).map(mapRow));
	accountsLoading.set(false);
}

let sub: Awaited<ReturnType<typeof supabase.channel>>;

export function subscribeAccounts() {
	sub = supabase
		.channel('accounts-changes')
		.on(
			'postgres_changes',
			{ event: '*', schema: 'public', table: 'accounts' },
			(payload: RealtimePostgresChangesPayload<{ id: string; name: string; icon: string; currency: string; balance: number }>) => {
				if (payload.eventType === 'INSERT') {
					accounts.update((current) => [...current, mapRow(payload.new)]);
				} else if (payload.eventType === 'UPDATE') {
					accounts.update((current) => current.map((a) => (a.id === payload.new.id ? mapRow(payload.new) : a)));
				} else if (payload.eventType === 'DELETE') {
					accounts.update((current) => current.filter((a) => a.id !== payload.old.id));
				}
			},
		)
		.subscribe((status) => {
			if (status === 'SUBSCRIBED') loadAccounts();
		});
}

export function unsubscribeAccounts() {
	sub?.unsubscribe();
}

function authHeaders() {
	const key = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	return {
		'Content-Type': 'application/json',
		'Authorization': `Bearer ${key}`,
	};
}

export async function addAccount(account: Omit<Account, 'id'>, userId: string) {
	const res = await fetch(`${env.PUBLIC_SUPABASE_URL}/functions/v1/create-account`, {
		method: 'POST',
		headers: authHeaders(),
		body: JSON.stringify({
			name: account.label,
			icon: account.icon,
			currency: account.currency,
			balance: account.balance,
			user_id: userId,
		}),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error);
	}
	const raw = await res.json();
	return mapRow(raw);
}

export async function deleteAccount(id: string) {
	const { error } = await supabase.from('accounts').delete().eq('id', id);
	if (error) throw new Error(error.message);
}

export async function topUpAccount(id: string, amount: number, userId: string) {
	const res = await fetch(`${env.PUBLIC_SUPABASE_URL}/functions/v1/top-up-account`, {
		method: 'POST',
		headers: authHeaders(),
		body: JSON.stringify({
			account_id: id,
			amount,
			currency: 'PHP',
			user_id: userId,
		}),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error);
	}
}

export async function transferAccount(fromId: string, toId: string, amount: number, userId: string) {
	const res = await fetch(`${env.PUBLIC_SUPABASE_URL}/functions/v1/transfer-account`, {
		method: 'POST',
		headers: authHeaders(),
		body: JSON.stringify({
			from_id: fromId,
			to_id: toId,
			amount,
			currency: 'PHP',
			user_id: userId,
		}),
	});
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error);
	}
}
