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

  const { from_id, to_id, amount, currency, description, user_id } = await req.json();

  if (!from_id || typeof from_id !== "string") {
    return new Response(JSON.stringify({ error: "from_id is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!to_id || typeof to_id !== "string") {
    return new Response(JSON.stringify({ error: "to_id is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (typeof amount !== "number" || amount <= 0) {
    return new Response(JSON.stringify({ error: "amount must be a positive number" }), {
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

  const { data, error: rpcError } = await supabase.rpc(
    "transfer_between_accounts",
    {
      p_from_id: from_id,
      p_to_id: to_id,
      p_amount: amount,
      p_user_id: user_id,
      p_currency: currency || "PHP",
      p_description: description || null,
    },
  );

  if (rpcError) {
    return new Response(JSON.stringify({ error: rpcError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
