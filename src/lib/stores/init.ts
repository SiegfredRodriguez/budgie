import { writable, derived } from 'svelte/store';
import { authReady, session } from './auth';

export const accountsReady = writable(false);
export const expensesReady = writable(false);

export const bootstrapReady = derived(
	[authReady, session, accountsReady, expensesReady],
	([$authReady, $session, $accountsReady, $expensesReady]) => {
		if (!$authReady) return false;
		if (!$session) return true;
		return $accountsReady && $expensesReady;
	},
);
