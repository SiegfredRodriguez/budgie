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

	const { account_id, amount, currency, description } = await req.json();

	if (!account_id || typeof account_id !== "string") {
		return jsonResponse({ error: "account_id is required" }, 400);
	}

	if (typeof amount !== "number" || amount <= 0) {
		return jsonResponse({ error: "amount must be a positive number" }, 400);
	}

	const supabase = serviceClient();

	const { data: account, error: rpcError } = await supabase.rpc("top_up_account", {
		p_account_id: account_id,
		p_amount: amount,
		p_user_id: userId,
		p_currency: currency || "PHP",
		p_description: description || null,
	});

	if (rpcError) {
		return jsonResponse({ error: rpcError.message }, 500);
	}

	return jsonResponse(account);
});
