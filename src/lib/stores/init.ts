import { writable, derived } from 'svelte/store';
import { authReady, session } from './auth';

export const accountsReady = writable(false);
export const expensesReady = writable(false);
export const tagsReady = writable(false);

export const bootstrapReady = derived(
	[authReady, session, accountsReady, expensesReady, tagsReady],
	([$authReady, $session, $accountsReady, $expensesReady, $tagsReady]) => {
		if (!$authReady) return false;
		if (!$session) return true;
		return $accountsReady && $expensesReady && $tagsReady;
	},
);
