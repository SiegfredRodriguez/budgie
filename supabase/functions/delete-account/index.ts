import { authenticate, corsHeaders, jsonResponse, serviceClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: corsHeaders });
	}
	if (req.method !== "POST") {
		return jsonResponse({ error: "Method not allowed" }, 405);
	}

	const auth = await authenticate(req);
	if (auth instanceof Response) return auth;
	const { userId } = auth;

	const { id } = await req.json();

	if (!id || typeof id !== "string") {
		return jsonResponse({ error: "id is required" }, 400);
	}

	const supabase = serviceClient();

	// Idempotent: retrying a soft-delete is always safe, unlike money-moving
	// operations, so this is fine to fire-and-forget-and-retry like tags and
	// payees. Scoped to the caller's own row rather than trusting the
	// payload's ownership implicitly.
	const { data, error } = await supabase
		.from("accounts")
		.update({ is_deleted: true })
		.eq("id", id)
		.eq("user_id", userId)
		.select("id, last_modified")
		.maybeSingle();

	if (error) {
		return jsonResponse({ error: error.message }, 500);
	}
	if (!data) {
		return jsonResponse({ error: "Account not found" }, 404);
	}

	return jsonResponse(data);
});
