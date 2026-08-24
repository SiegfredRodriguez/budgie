import { supabase } from "$lib/supabase";
import { env } from "$env/dynamic/public";

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

	const res = await fetch(`${env.PUBLIC_SUPABASE_URL}/functions/v1/${name}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			apikey: env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
			Authorization: `Bearer ${session.access_token}`,
		},
		body: JSON.stringify(body),
	});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error);
	}
	return res.json();
}
