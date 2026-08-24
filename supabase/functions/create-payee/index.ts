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

	const { label, icon, tagIds } = await req.json();

	if (!label || typeof label !== "string") {
		return jsonResponse({ error: "label is required" }, 400);
	}

	const supabase = serviceClient();

	const { data: payee, error: payeeError } = await supabase
		.from("payees")
		.insert({ label: label.trim(), icon: icon ?? "", user_id: userId })
		.select()
		.single();

	if (payeeError) {
		return jsonResponse({ error: payeeError.message }, 500);
	}

	if (Array.isArray(tagIds) && tagIds.length > 0) {
		const links = tagIds.map((tag_id: string) => ({
			payee_id: payee.id,
			tag_id,
		}));

		const { error: tagError } = await supabase.from("payees_tags").insert(links);

		if (tagError) {
			return jsonResponse({ error: tagError.message }, 500);
		}
	}

	return jsonResponse(payee);
});
