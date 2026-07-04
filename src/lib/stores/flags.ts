import { writable } from 'svelte/store';
import { initialize } from 'launchdarkly-js-client-sdk';
import { PUBLIC_LD_CLIENT_ID } from '$env/static/public';

export const flags = writable<Record<string, boolean | string | number>>({});
export const ldReady = writable(false);

let client: Awaited<ReturnType<typeof initialize>>;

export async function initLD(userKey?: string) {
	if (client) return;

	client = initialize(PUBLIC_LD_CLIENT_ID, {
		key: userKey ?? 'anonymous',
		anonymous: !userKey,
	});

	await client.waitForInitialization();

	const allFlags = client.allFlags();
	flags.set(allFlags);
	ldReady.set(true);

	client.on('change', (changed: Record<string, boolean | string | number>) => {
		flags.update((current) => ({ ...current, ...changed }));
	});
}
