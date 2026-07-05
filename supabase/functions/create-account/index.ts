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

  const { name, icon, currency, balance, user_id } = await req.json();

  if (!name || typeof name !== "string") {
    return new Response(JSON.stringify({ error: "name is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  if (!user_id || typeof user_id !== "string") {
    return new Response(JSON.stringify({ error: "user_id is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: account, error: insertError } = await supabase.rpc(
    "create_account_with_transaction",
    {
      p_name: name,
      p_user_id: user_id,
      p_icon: icon || "bank",
      p_currency: currency || "PHP",
      p_balance: typeof balance === "number" ? balance : 0,
    },
  );

  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(account), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
