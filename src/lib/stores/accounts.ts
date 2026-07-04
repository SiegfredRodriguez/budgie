import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export interface Account {
	id: string;
	icon: string;
	label: string;
	currency: string;
	balance: number;
}

const initial: Account[] = [];

export const accounts = writable<Account[]>(initial);

function mapRow(r: any): Account {
	return { id: r.id, icon: r.icon, label: r.name, currency: r.currency, balance: r.balance };
}

export async function loadAccounts() {
	const { data, error } = await supabase
		.from('accounts')
		.select('id,name,icon,currency,balance')
		.order('created_at', { ascending: true });
	if (error) return;
	accounts.set((data ?? []).map(mapRow));
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

export async function addAccount(account: Omit<Account, 'id'>) {
	const res = await fetch(`${PUBLIC_SUPABASE_URL}/functions/v1/create-account`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${PUBLIC_SUPABASE_ANON_KEY}`,
		},
		body: JSON.stringify({
			name: account.label,
			icon: account.icon,
			currency: account.currency,
			balance: account.balance,
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

export function topUpAccount(id: string, amount: number) {
	accounts.update((current) =>
		current.map((a) => (a.id === id ? { ...a, balance: a.balance + amount } : a)),
	);
}

export function transferAccount(fromId: string, toId: string, amount: number) {
	accounts.update((current) =>
		current.map((a) => {
			if (a.id === fromId) return { ...a, balance: a.balance - amount };
			if (a.id === toId) return { ...a, balance: a.balance + amount };
			return a;
		}),
	);
}
