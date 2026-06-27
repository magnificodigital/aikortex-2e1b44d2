// Edge function: mints an ElevenLabs Conversational Agent WebRTC token
// using the authenticated user's own ElevenLabs API key + agent id (BYOK).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "missing_auth" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "unauthorized" }, 401);
    }
    const userId = userData.user.id;

    // Service-role client to bypass RLS for credential lookup.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: keys } = await admin
      .from("user_api_keys")
      .select("provider, api_key")
      .eq("user_id", userId)
      .in("provider", ["elevenlabs", "elevenlabs_agent_id"]);

    const map = new Map<string, string>();
    (keys ?? []).forEach((row: any) => map.set(row.provider, row.api_key ?? ""));

    const apiKey = map.get("elevenlabs") ?? "";
    const agentId = map.get("elevenlabs_agent_id") ?? "";

    if (!apiKey) {
      return json({ error: "elevenlabs_not_configured", message: "Configure sua chave ElevenLabs em Configurações → Voz." }, 400);
    }
    if (!agentId) {
      return json({ error: "agent_id_missing", message: "Configure o Agent ID do seu Stark em Configurações → Voz." }, 400);
    }

    const resp = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": apiKey } },
    );

    if (!resp.ok) {
      const text = await resp.text();
      return json({ error: "elevenlabs_error", status: resp.status, details: text }, 400);
    }

    const data = await resp.json();
    return json({ token: data.token, agentId });
  } catch (e) {
    return json({ error: "internal", message: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
