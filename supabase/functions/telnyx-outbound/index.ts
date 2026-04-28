import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { agent_id, phone_to } = await req.json();

    if (!agent_id || !phone_to) {
      return new Response(JSON.stringify({ error: "agent_id and phone_to are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    // Get Telnyx API key (user key → platform key → env)
    let telnyxApiKey = "";
    const { data: userKey } = await supabase
      .from("user_api_keys")
      .select("api_key")
      .eq("user_id", userId)
      .eq("provider", "telnyx")
      .single();

    if (userKey?.api_key) {
      telnyxApiKey = userKey.api_key;
    } else {
      const { data: platformKey } = await supabase
        .from("platform_config")
        .select("value")
        .eq("key", "telnyx_api_key")
        .single();
      telnyxApiKey = (platformKey as any)?.value ?? Deno.env.get("TELNYX_API_KEY") ?? "";
    }

    if (!telnyxApiKey) {
      return new Response(
        JSON.stringify({ error: "Telnyx API key not configured", action: "configure_key" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get agent config
    const { data: agent } = await supabase
      .from("user_agents")
      .select("*")
      .eq("id", agent_id)
      .eq("user_id", userId)
      .single();

    if (!agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!agent.telnyx_phone_number) {
      return new Response(
        JSON.stringify({ error: "No phone number configured for this agent" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get connection ID (platform config → env)
    let connectionId = "";
    const { data: connConfig } = await supabase
      .from("platform_config")
      .select("value")
      .eq("key", "telnyx_connection_id")
      .single();
    connectionId = (connConfig as any)?.value ?? Deno.env.get("TELNYX_CONNECTION_ID") ?? "";

    // Encode agent context in client_state
    const clientState = btoa(JSON.stringify({ agent_id, user_id: userId }));

    // Initiate call via Telnyx
    const telnyxRes = await fetch("https://api.telnyx.com/v2/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${telnyxApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        connection_id: connectionId,
        to: phone_to,
        from: agent.telnyx_phone_number,
        webhook_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/telnyx-webhook`,
        client_state: clientState,
      }),
    });

    const callData = await telnyxRes.json();
    if (!telnyxRes.ok) {
      return new Response(JSON.stringify({ error: callData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the call
    await supabase.from("call_logs").insert({
      user_id: userId,
      agent_id,
      direction: "outbound",
      channel: "phone",
      phone_from: agent.telnyx_phone_number,
      phone_to,
      status: "initiated",
      telnyx_call_id: callData.data?.call_control_id,
    });

    return new Response(
      JSON.stringify({ success: true, call_id: callData.data?.call_control_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
