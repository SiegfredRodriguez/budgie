import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response(null, { status: 204, headers: corsHeaders });
	}
	if (req.method !== "POST") {
		return new Response(JSON.stringify({ error: "Method not allowed" }), {
			status: 405,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}

	const { label, icon, tagIds, user_id } = await req.json();

	if (!label || typeof label !== "string") {
		return new Response(JSON.stringify({ error: "label is required" }), {
			status: 400,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}

	if (!user_id || typeof user_id !== "string") {
		return new Response(JSON.stringify({ error: "user_id is required" }), {
			status: 400,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}

	const supabase = createClient(
		Deno.env.get("SUPABASE_URL") ?? "",
		Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
	);

	const { data: payee, error: payeeError } = await supabase
		.from("payees")
		.insert({ label: label.trim(), icon: icon ?? "", user_id })
		.select()
		.single();

	if (payeeError) {
		return new Response(JSON.stringify({ error: payeeError.message }), {
			status: 500,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}

	if (Array.isArray(tagIds) && tagIds.length > 0) {
		const links = tagIds.map((tag_id: string) => ({
			payee_id: payee.id,
			tag_id,
		}));

		const { error: tagError } = await supabase
			.from("payees_tags")
			.insert(links);

		if (tagError) {
			return new Response(JSON.stringify({ error: tagError.message }), {
				status: 500,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			});
		}
	}

	return new Response(JSON.stringify(payee), {
		status: 200,
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});
});
