// stark-token (LiveKit edition)
// =============================
// Gera JWT do LiveKit pro frontend conectar no room do Stark Voice.
// Verifica creditos do tier + packs antes — se zero, retorna 402 sugerindo
// pack avulso. Master v7.5 §Stark.
//
// Substitui o stark-token antigo (que mintava token ElevenLabs Conversational
// Agent). Pre-LiveKit migration: aquele path nao e' mais usado.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Gera JWT do LiveKit com grants pra entrar no room do Stark.
 * Identity = userId. Room = stark-{userId} (1 room por user, sempre).
 * Metadata transporta agencyId + locale pro Stark Agent (Python) pegar.
 */
async function createLiveKitToken(
  apiKey: string,
  apiSecret: string,
  userId: string,
  agencyId: string | null,
  userName: string,
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const roomName = `stark-${userId}`;
  const claims = {
    iss: apiKey,
    sub: userId,
    iat: now,
    nbf: now,
    exp: now + 3600, // 1 hora — sessao tipica < 30 min, margem suficiente
    jti: `${userId}-${now}`,
    name: userName,
    video: {
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
    // Metadata serializado: Stark Agent (Python) le isso pra saber agency
    // (pra debitar creditos), locale (pra Deepgram STT), JWT do user (pra
    // tools com RLS).
    metadata: JSON.stringify({
      agencyId,
      userId,
      locale: "pt-BR",
    }),
  };

  const enc = new TextEncoder();
  const headerB64 = base64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64url(enc.encode(JSON.stringify(claims)));
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(apiSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(signingInput));
  return `${headerB64}.${payloadB64}.${base64url(new Uint8Array(sig))}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing_auth" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;
    const userName = userData.user.user_metadata?.full_name || userData.user.email || "User";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Lookup agency_profile do user
    const { data: agency } = await admin
      .from("agency_profiles")
      .select("id, monthly_voice_minutes, voice_minutes_used")
      .eq("user_id", userId)
      .maybeSingle();

    if (!agency) {
      return json({
        error: "no_agency_profile",
        message: "Perfil de agência não encontrado. Complete o onboarding primeiro.",
      }, 400);
    }

    // 2) Checa creditos disponiveis (chama consume com 0 minutos so pra ler)
    const { data: creditCheck } = await admin.rpc("consume_stark_voice_minutes", {
      p_agency_id: agency.id,
      p_minutes: 0,
    });

    const tierRemaining = (creditCheck as any)?.remaining_tier ?? 0;

    // 3) Soma com packs pagos disponiveis
    const { data: packs } = await admin
      .from("stark_voice_credit_packs")
      .select("minutes_total, minutes_used")
      .eq("user_id", userId)
      .eq("status", "paid")
      .or("expires_at.is.null,expires_at.gt.now()");

    const packRemaining = (packs ?? []).reduce(
      (sum: number, p: any) => sum + Math.max(0, (p.minutes_total ?? 0) - (p.minutes_used ?? 0)),
      0,
    );

    const totalRemaining = tierRemaining + packRemaining;
    if (totalRemaining < 1) {
      return json({
        error: "no_voice_credits",
        message: "Seus minutos de Stark voz acabaram este mês. Compre um pack ou aguarde o próximo ciclo.",
        tier_remaining: tierRemaining,
        pack_remaining: packRemaining,
        action: { type: "buy_pack" },
      }, 402);
    }

    // 4) Le creds LiveKit (Stark dedicated, separado das meetings)
    const lkUrl = Deno.env.get("LIVEKIT_STARK_URL");
    const lkKey = Deno.env.get("LIVEKIT_STARK_API_KEY");
    const lkSecret = Deno.env.get("LIVEKIT_STARK_API_SECRET");
    if (!lkUrl || !lkKey || !lkSecret) {
      console.error("[stark-token] LiveKit Stark env vars ausentes");
      return json({
        error: "livekit_not_configured",
        message: "Configuração do Stark Voice incompleta. Avise o admin.",
      }, 500);
    }

    // 5) Gera JWT
    const token = await createLiveKitToken(lkKey, lkSecret, userId, agency.id, userName);
    const roomName = `stark-${userId}`;

    return json({
      token,
      url: lkUrl,
      room: roomName,
      remaining_minutes: totalRemaining,
      tier_remaining: tierRemaining,
      pack_remaining: packRemaining,
    });
  } catch (e) {
    console.error("[stark-token] error:", e);
    return json({ error: "internal", message: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
