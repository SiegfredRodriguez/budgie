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

	const { id, value } = await req.json();

	if (!value || typeof value !== "string") {
		return jsonResponse({ error: "value is required" }, 400);
	}

	const sanitized = value.toLowerCase().replace(/[^a-z0-9]/g, "");

	if (sanitized.length === 0) {
		return jsonResponse(
			{ error: "Tag value must contain at least one alphanumeric character" },
			400,
		);
	}

	const supabase = serviceClient();

	// A client-generated `id` lets an optimistic local write and its sync
	// push agree on the same row identity, and makes a retried push (e.g.
	// after a dropped response) idempotent instead of erroring.
	const write =
		typeof id === "string" && id.length > 0
			? supabase.from("tags").upsert({ id, value: sanitized }, { onConflict: "id" }).select().single()
			: supabase.from("tags").insert({ value: sanitized }).select().single();

	let { data, error } = await write;

	if (error?.code === "23505") {
		// Another id already holds this value — most likely two offline
		// clients independently created the same tag, but could also be a
		// previously soft-deleted one being recreated. Treat it as success
		// and hand back the canonical row (un-deleting it if needed) so the
		// caller can reconcile its local record onto it, instead of erroring.
		const revived = await supabase
			.from("tags")
			.update({ is_deleted: false })
			.eq("value", sanitized)
			.select()
			.single();
		if (revived.error) {
			return jsonResponse({ error: revived.error.message }, 500);
		}
		data = revived.data;
		error = null;
	}

	if (error) {
		return jsonResponse({ error: error.message }, 500);
	}

	return jsonResponse(data);
});
