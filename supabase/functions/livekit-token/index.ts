import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Minimal JWT generation for LiveKit
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
  name: string,
  roomName: string,
  isHost: boolean
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  
  const claims: Record<string, unknown> = {
    iss: apiKey,
    sub: identity,
    iat: now,
    nbf: now,
    exp: now + 86400, // 24 hours
    jti: identity + "-" + now,
    video: {
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
    metadata: JSON.stringify({ name, isHost }),
    name: name,
  };

  if (isHost) {
    (claims.video as Record<string, unknown>).roomAdmin = true;
    (claims.video as Record<string, unknown>).roomCreate = true;
  }

  const enc = new TextEncoder();
  const headerB64 = base64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64url(enc.encode(JSON.stringify(claims)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(signingInput));
  const sigB64 = base64url(new Uint8Array(sig));

  return `${headerB64}.${payloadB64}.${sigB64}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { roomName, identity, name, isHost } = await req.json();

    if (!roomName || !identity || !name) {
      return new Response(JSON.stringify({ error: "roomName, identity e name são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    const livekitUrl = Deno.env.get("LIVEKIT_URL");

    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error("Missing LiveKit env vars");
      return new Response(JSON.stringify({ error: "Configuração do LiveKit incompleta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await createLiveKitToken(
      apiKey,
      apiSecret,
      identity,
      name,
      roomName,
      isHost === true
    );

    return new Response(JSON.stringify({ token, url: livekitUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("livekit-token error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
