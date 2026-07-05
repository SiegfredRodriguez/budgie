import { writable } from 'svelte/store';
import { initialize } from 'launchdarkly-js-client-sdk';
import { env } from '$env/dynamic/public';

export const flags = writable<Record<string, boolean | string | number>>({});
export const ldReady = writable(false);

let client: Awaited<ReturnType<typeof initialize>>;

export async function initLD(userKey?: string) {
	if (client) return;

	const ldClientId = env.PUBLIC_LD_CLIENT_SIDE_ID || '6a492c91473ad80a90977934';

	client = initialize(ldClientId, {
		key: userKey ?? 'anonymous',
		anonymous: !userKey,
	});

	await client.waitForInitialization();

	const allFlags = client.allFlags();
	flags.set(allFlags);
	ldReady.set(true);

	client.on('change', () => {
		flags.set(client.allFlags());
	});
}
