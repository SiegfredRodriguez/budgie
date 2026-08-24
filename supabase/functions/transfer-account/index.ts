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

	const { from_id, to_id, amount, currency, description } = await req.json();

	if (!from_id || typeof from_id !== "string") {
		return jsonResponse({ error: "from_id is required" }, 400);
	}

	if (!to_id || typeof to_id !== "string") {
		return jsonResponse({ error: "to_id is required" }, 400);
	}

	if (typeof amount !== "number" || amount <= 0) {
		return jsonResponse({ error: "amount must be a positive number" }, 400);
	}

	const supabase = serviceClient();

	const { data, error: rpcError } = await supabase.rpc("transfer_between_accounts", {
		p_from_id: from_id,
		p_to_id: to_id,
		p_amount: amount,
		p_user_id: userId,
		p_currency: currency || "PHP",
		p_description: description || null,
	});

	if (rpcError) {
		return jsonResponse({ error: rpcError.message }, 500);
	}

	return jsonResponse(data);
});
