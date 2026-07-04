import { writable } from 'svelte/store';
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

export async function loadAccounts() {
	const res = await fetch(`${PUBLIC_SUPABASE_URL}/rest/v1/accounts?select=id,name,icon,currency,balance&order=created_at.asc`, {
		headers: { 'apikey': PUBLIC_SUPABASE_ANON_KEY },
	});
	if (!res.ok) return;
	const data = await res.json();
	accounts.set(data.map((r: any) => ({ id: r.id, icon: r.icon, label: r.name, currency: r.currency, balance: r.balance })));
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
	const created: Account = { id: raw.id, icon: raw.icon, label: raw.name, currency: raw.currency, balance: raw.balance };
	accounts.update((current) => [...current, created]);
	return created;
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
