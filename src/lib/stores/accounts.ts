import { writable } from 'svelte/store';

export interface Account {
	id: string;
	icon: string;
	label: string;
	currency: string;
	balance: number;
}

const initial: Account[] = [
	{ id: 'checking', icon: 'bank', label: 'Checking Account', currency: 'PHP', balance: 250_000_000 },
	{ id: 'savings', icon: 'piggy', label: 'Savings Account', currency: 'USD', balance: 50_000 },
	{ id: 'credit', icon: 'card', label: 'Credit Card', currency: 'PHP', balance: -12_430.25 },
	{ id: 'invest', icon: 'bank', label: 'Investment Portfolio', currency: 'USD', balance: 1_250_000 },
	{ id: 'travel', icon: 'card', label: 'Travel Rewards', currency: 'PHP', balance: 85_200 },
	{ id: 'emergency', icon: 'piggy', label: 'Emergency Fund', currency: 'USD', balance: 30_000 },
	{ id: 'business', icon: 'bank', label: 'Business Account', currency: 'PHP', balance: 3_750_000 },
	{ id: 'insurance', icon: 'card', label: 'Insurance Savings', currency: 'USD', balance: 15_500 },
];

export const accounts = writable<Account[]>(initial);

export function addAccount(account: Account) {
	accounts.update((current) => [...current, account]);
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
