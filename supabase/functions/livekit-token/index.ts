import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
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
    exp: now + 7200, // 2 hours
    jti: identity + "-" + now,
    video: {
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
    metadata: JSON.stringify({ name, isHost }),
    name,
  };
  if (isHost) {
    (claims.video as Record<string, unknown>).roomAdmin = true;
    (claims.video as Record<string, unknown>).roomCreate = true;
  }
  const enc = new TextEncoder();
  const headerB64 = base64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64url(enc.encode(JSON.stringify(claims)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey("raw", enc.encode(apiSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(signingInput));
  return `${headerB64}.${payloadB64}.${base64url(new Uint8Array(sig))}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { roomName, identity, name, isHost } = await req.json();
    if (!roomName || !identity || !name) {
      return new Response(JSON.stringify({ error: "roomName, identity e name são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Look up the meeting by room_id
    const { data: meeting } = await admin
      .from("meetings")
      .select("id, host_user_id, status")
      .eq("room_id", roomName)
      .maybeSingle();

    if (!meeting) {
      return new Response(JSON.stringify({ error: "Reunião não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (meeting.status === "ended") {
      return new Response(JSON.stringify({ error: "Reunião encerrada" }), {
        status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve authenticated user (if any)
    const authHeader = req.headers.get("Authorization") || "";
    let authUserId: string | null = null;
    if (authHeader) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      authUserId = user?.id ?? null;
    }

    // Authorization rules:
    // - Host token: caller MUST be authenticated AND match meeting.host_user_id
    // - Non-host: must be authenticated participant OR an approved/admitted guest
    let grantHost = false;
    if (isHost === true) {
      if (!authUserId || authUserId !== meeting.host_user_id) {
        return new Response(JSON.stringify({ error: "Apenas o anfitrião pode obter token de host" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      grantHost = true;
    } else {
      // Non-host path: allow if authenticated, or if guest is approved in waiting room
      if (!authUserId) {
        const { data: wr } = await admin
          .from("meeting_waiting_room")
          .select("status")
          .eq("meeting_id", meeting.id)
          .eq("guest_id", identity)
          .maybeSingle();
        if (!wr || wr.status !== "approved") {
          return new Response(JSON.stringify({ error: "Acesso de convidado não autorizado" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    const livekitUrl = Deno.env.get("LIVEKIT_URL");
    if (!apiKey || !apiSecret || !livekitUrl) {
      console.error("Missing LiveKit env vars");
      return new Response(JSON.stringify({ error: "Configuração do LiveKit incompleta" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await createLiveKitToken(apiKey, apiSecret, identity, name, roomName, grantHost);
    return new Response(JSON.stringify({ token, url: livekitUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("livekit-token error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
