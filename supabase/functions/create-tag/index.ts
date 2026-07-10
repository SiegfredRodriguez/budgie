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

	const { value, user_id } = await req.json();

	if (!value || typeof value !== "string") {
		return new Response(JSON.stringify({ error: "value is required" }), {
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

	const sanitized = value.toLowerCase().replace(/[^a-z0-9]/g, "");

	if (sanitized.length === 0) {
		return new Response(
			JSON.stringify({ error: "Tag value must contain at least one alphanumeric character" }),
			{
				status: 400,
				headers: { ...corsHeaders, "Content-Type": "application/json" },
			},
		);
	}

	const supabase = createClient(
		Deno.env.get("SUPABASE_URL") ?? "",
		Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
	);

	const { data, error } = await supabase
		.from("tags")
		.insert({ value: sanitized })
		.select()
		.single();

	if (error) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
			headers: { ...corsHeaders, "Content-Type": "application/json" },
		});
	}

	return new Response(JSON.stringify(data), {
		status: 200,
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});
});
