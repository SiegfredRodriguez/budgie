import { supabase } from "$lib/supabase";
import { env } from "$env/dynamic/public";

/** Thrown when the request never reached the server at all (offline, DNS
 * failure, connection dropped mid-flight) — as opposed to a request that
 * DID reach the server and was rejected there. Callers that queue-and-retry
 * offline writes (see local/ledger.ts) need to tell these apart: a
 * NetworkError means "try again later, nothing is known yet"; any other
 * error means "the server looked at this and said no — retrying won't
 * change that." */
export class NetworkError extends Error {
	constructor(message = "Network request failed") {
		super(message);
		this.name = "NetworkError";
	}
}

/**
 * Calls a Supabase edge function as the signed-in user.
 *
 * Sends the caller's real session token, not the public anon key, so the
 * function can verify who is actually calling via `auth.getUser()` instead
 * of trusting a client-supplied user id.
 */
export async function callFunction<T>(name: string, body: unknown): Promise<T> {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session) throw new Error("Not signed in");

	let res: Response;
	try {
		res = await fetch(`${env.PUBLIC_SUPABASE_URL}/functions/v1/${name}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				apikey: env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
				Authorization: `Bearer ${session.access_token}`,
			},
			body: JSON.stringify(body),
		});
	} catch (e) {
		throw new NetworkError(e instanceof Error ? e.message : "Network request failed");
	}

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error);
	}
	return res.json();
}
