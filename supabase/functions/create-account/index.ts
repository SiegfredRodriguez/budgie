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

	const { id, transaction_id, name, icon, currency, balance } = await req.json();

	if (!name || typeof name !== "string") {
		return jsonResponse({ error: "name is required" }, 400);
	}

	const supabase = serviceClient();

	const { data: account, error: insertError } = await supabase.rpc(
		"create_account_with_transaction",
		{
			p_name: name,
			p_user_id: userId,
			p_icon: icon || "bank",
			p_currency: currency || "PHP",
			p_balance: typeof balance === "number" ? balance : 0,
			p_id: id || undefined,
			p_transaction_id: transaction_id || undefined,
		},
	);

	if (insertError) {
		return jsonResponse({ error: insertError.message }, 500);
	}

	return jsonResponse(account);
});
