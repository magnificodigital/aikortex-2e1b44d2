import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/* ── Minimal JWT for LiveKit ── */
function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function createLiveKitToken(
  apiKey: string,
  apiSecret: string,
  identity: string,
  roomName: string,
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: apiKey,
    sub: identity,
    iat: now,
    nbf: now,
    exp: now + 3600,
    jti: `${identity}-${now}`,
    video: {
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
  };

  const enc = new TextEncoder();
  const hB64 = base64url(enc.encode(JSON.stringify(header)));
  const pB64 = base64url(enc.encode(JSON.stringify(claims)));
  const input = `${hB64}.${pB64}`;
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(input));
  return `${input}.${base64url(new Uint8Array(sig))}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Auth
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { agent_id } = await req.json();
    if (!agent_id) {
      return new Response(
        JSON.stringify({ error: "agent_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch agent
    const { data: agent, error: agentErr } = await supabase
      .from("user_agents")
      .select("*")
      .eq("id", agent_id)
      .eq("user_id", user.id)
      .single();

    if (agentErr || !agent) {
      return new Response(
        JSON.stringify({ error: "Agente não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // LiveKit config
    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    const livekitUrl = Deno.env.get("LIVEKIT_URL");

    if (!apiKey || !apiSecret || !livekitUrl) {
      return new Response(
        JSON.stringify({ error: "LiveKit não configurado no servidor" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const roomName = `browser-call-${agent_id}-${Date.now()}`;
    const userToken = await createLiveKitToken(apiKey, apiSecret, user.id, roomName);

    // Log browser call
    await supabase.from("call_logs").insert({
      user_id: user.id,
      agent_id,
      direction: "outbound",
      channel: "browser",
      status: "in_progress",
      started_at: new Date().toISOString(),
      telnyx_call_id: roomName, // reuse field for room tracking
    });

    return new Response(
      JSON.stringify({
        token: userToken,
        room_name: roomName,
        livekit_url: livekitUrl,
        agent: {
          id: agent.id,
          name: agent.name,
          voice_id: agent.voice_id,
          voice_stability: agent.voice_stability,
          voice_language: agent.voice_language,
          config: agent.config,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("livekit-call error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
