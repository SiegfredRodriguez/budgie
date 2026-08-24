import { createClient } from "jsr:@supabase/supabase-js@2";

export const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});
}

/** A client authorized as the project's service role — bypasses RLS, only for use after `authenticate()` has verified the caller. */
export function serviceClient() {
	return createClient(
		Deno.env.get("SUPABASE_URL") ?? "",
		Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
	);
}

/**
 * Resolves the calling user from their session JWT (the `Authorization` header),
 * never from a client-supplied `user_id` field — the caller cannot claim to be
 * anyone but themselves. Returns a ready-to-send 401 Response on failure so
 * callers can just `if (auth instanceof Response) return auth;`.
 */
export async function authenticate(req: Request): Promise<{ userId: string } | Response> {
	const authClient = createClient(
		Deno.env.get("SUPABASE_URL") ?? "",
		Deno.env.get("SUPABASE_ANON_KEY") ?? "",
		{ global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
	);
	const { data, error } = await authClient.auth.getUser();
	if (error || !data.user) {
		return jsonResponse({ error: "Unauthorized" }, 401);
	}
	return { userId: data.user.id };
}
