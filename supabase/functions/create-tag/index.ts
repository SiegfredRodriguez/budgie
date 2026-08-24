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

	const { value } = await req.json();

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

	const { data, error } = await supabase
		.from("tags")
		.insert({ value: sanitized })
		.select()
		.single();

	if (error) {
		return jsonResponse({ error: error.message }, 500);
	}

	return jsonResponse(data);
});
