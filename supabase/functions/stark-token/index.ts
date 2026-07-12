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
 * Sanitiza o page_context vindo do frontend antes de entrar no JWT.
 * Whitelist de campos + truncamento — evita: (a) JWT inflado com payload
 * arbitrario, (b) prompt injection via strings longas/multilinha (o
 * backend Python sanitiza de novo, defesa em profundidade).
 */
function sanitizePageContext(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const pc = raw as Record<string, unknown>;
  const str = (v: unknown, max: number): string | undefined =>
    typeof v === "string" && v.trim() ? v.replace(/[\r\n]+/g, " ").trim().slice(0, max) : undefined;

  let entity: Record<string, unknown> | undefined;
  if (pc.entity && typeof pc.entity === "object") {
    const e = pc.entity as Record<string, unknown>;
    const type = str(e.type, 40);
    const id = str(e.id, 64);
    const name = str(e.name, 120);
    if (type || id || name) entity = { type, id, name };
  }

  const path = str(pc.path, 200);
  const route = str(pc.route, 80);
  if (!path && !route) return null;
  return { path, route, entity };
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
  pageContext: unknown,
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
    // tools com RLS), e page_context (rota/entidade onde o user esta).
    metadata: JSON.stringify({
      agencyId,
      userId,
      locale: "pt-BR",
      page_context: pageContext ?? null,
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

    // Body opcional: { page_context?: {...} } — frontend manda a rota atual
    // pra o Stark saber onde o user esta. Ausente = home/generico.
    let pageContext: unknown = null;
    try {
      const bodyText = await req.text();
      if (bodyText) {
        const parsed = JSON.parse(bodyText);
        pageContext = sanitizePageContext(parsed?.page_context);
      }
    } catch { /* body invalido — segue sem contexto */ }

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
    // NOTA: PostgREST nao avalia now() em filtros — precisa de timestamp
    // literal. Com "now()" a query quebrava e packs eram ignorados.
    const nowIso = new Date().toISOString();
    const { data: packs } = await admin
      .from("stark_voice_credit_packs")
      .select("minutes_total, minutes_used")
      .eq("user_id", userId)
      .eq("status", "paid")
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`);

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
    const token = await createLiveKitToken(lkKey, lkSecret, userId, agency.id, userName, pageContext);
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
