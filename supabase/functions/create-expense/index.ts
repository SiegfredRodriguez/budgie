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

	const { account_id, amount, label, date, currency, payee_id, payee_label, transaction_id, expense_id } = await req.json();

	if (!account_id || typeof account_id !== "string") {
		return jsonResponse({ error: "account_id is required" }, 400);
	}

	if (typeof amount !== "number" || amount <= 0) {
		return jsonResponse({ error: "amount must be a positive number" }, 400);
	}

	if (!label || typeof label !== "string") {
		return jsonResponse({ error: "label is required" }, 400);
	}

	if (!date || typeof date !== "string") {
		return jsonResponse({ error: "date is required" }, 400);
	}

	const supabase = serviceClient();

	const { data, error: rpcError } = await supabase.rpc("create_expense", {
		p_account_id: account_id,
		p_amount: amount,
		p_label: label,
		p_date: date,
		p_user_id: userId,
		p_payee_id: payee_id ?? null,
		p_payee_label: payee_label ?? null,
		p_currency: currency || "PHP",
		p_transaction_id: transaction_id || undefined,
		p_expense_id: expense_id || undefined,
	});

	if (rpcError) {
		return jsonResponse({ error: rpcError.message }, 500);
	}

	return jsonResponse(data);
});
