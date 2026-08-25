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

	const { id, label, icon, tagIds } = await req.json();

	if (!label || typeof label !== "string") {
		return jsonResponse({ error: "label is required" }, 400);
	}

	const supabase = serviceClient();

	// A client-generated `id` lets an optimistic local write and its sync
	// push agree on the same row identity, and makes a retried push (e.g.
	// after a dropped response) idempotent instead of erroring — same
	// pattern as create-tag. `payees.label` has no unique constraint, so
	// unlike tags there's no cross-client value collision to resolve.
	const write =
		typeof id === "string" && id.length > 0
			? supabase
					.from("payees")
					.upsert({ id, label: label.trim(), icon: icon ?? "", user_id: userId }, { onConflict: "id" })
					.select()
					.single()
			: supabase.from("payees").insert({ label: label.trim(), icon: icon ?? "", user_id: userId }).select().single();

	const { data: payee, error: payeeError } = await write;

	if (payeeError) {
		return jsonResponse({ error: payeeError.message }, 500);
	}

	if (Array.isArray(tagIds) && tagIds.length > 0) {
		const links = tagIds.map((tag_id: string) => ({
			payee_id: payee.id,
			tag_id,
		}));

		// A link row is just its composite key — nothing to update if it's
		// already there — so ignore the conflict rather than upserting; that
		// only needs INSERT, not UPDATE, and a retried push (e.g. after a
		// dropped response) becomes idempotent either way.
		const { error: tagError } = await supabase
			.from("payees_tags")
			.upsert(links, { onConflict: "payee_id,tag_id", ignoreDuplicates: true });

		if (tagError) {
			return jsonResponse({ error: tagError.message }, 500);
		}
	}

	return jsonResponse(payee);
});
