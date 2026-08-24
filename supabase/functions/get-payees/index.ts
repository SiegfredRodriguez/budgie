import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/auth.ts";

Deno.serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: corsHeaders });
	}
	if (req.method !== "POST") {
		return jsonResponse({ error: "Method not allowed" }, 405);
	}

	const supabase = createClient(
		Deno.env.get("SUPABASE_URL") ?? "",
		Deno.env.get("SUPABASE_ANON_KEY") ?? "",
		{ global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
	);

	const { data, error } = await supabase
		.from("payees")
		.select("*, payees_tags(tags(*))")
		.order("label", { ascending: true });

	if (error) {
		return jsonResponse({ error: error.message }, 500);
	}

	return jsonResponse({ data });
});
