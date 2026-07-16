// instagram-connect
// =================
// Conexao do Instagram via "Instagram API com Login do Instagram" (a NOVA,
// sem Pagina do Facebook). O cliente faz login DIRETO com o Instagram —
// sem pages_*, sem Business Manager.
//
// Fluxo:
//   1. Frontend redireciona pra instagram.com/oauth/authorize (scopes
//      instagram_business_basic + instagram_business_manage_messages)
//   2. Instagram volta em /settings?tab=channels&code=...&state=ig_login
//   3. POST aqui { code, redirect_uri }
//   4. code → short-lived token (api.instagram.com/oauth/access_token)
//   5. short → long-lived 60d (graph.instagram.com/access_token)
//   6. perfil (me?fields=user_id,username) → salva token + ig id em
//      user_api_keys. Webhook e' de app (configurado 1x no painel), entao
//      nao precisa subscribe por conta — best-effort so pra garantir.
//
// Requer: platform_config.meta_instagram_app_id (Instagram App ID, publico)
//         env INSTAGRAM_APP_SECRET (Instagram App Secret, secreto)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const IG_GRAPH = "https://graph.instagram.com";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const { data: { user }, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !user) return json({ error: "UNAUTHORIZED" }, 401);

  let payload: { code?: string; redirect_uri?: string };
  try { payload = await req.json(); } catch { return json({ error: "INVALID_JSON" }, 400); }
  if (!payload.code || !payload.redirect_uri) {
    return json({ error: "MISSING_FIELDS", message: "code e redirect_uri obrigatórios" }, 400);
  }

  // Instagram App ID (config do admin) + App Secret (env secreta)
  const { data: cfg } = await admin
    .from("platform_config").select("value").eq("key", "meta_instagram_app_id").maybeSingle();
  const igAppId = (cfg?.value ?? "").trim();
  const igAppSecret = Deno.env.get("INSTAGRAM_APP_SECRET");
  if (!igAppId || !igAppSecret) {
    return json({
      error: "NOT_CONFIGURED",
      message: "Falta o Instagram App ID (admin) ou INSTAGRAM_APP_SECRET (secrets do Supabase).",
    }, 500);
  }

  try {
    // 1) code → short-lived token (form-urlencoded, POST)
    const form = new FormData();
    form.append("client_id", igAppId);
    form.append("client_secret", igAppSecret);
    form.append("grant_type", "authorization_code");
    form.append("redirect_uri", payload.redirect_uri);
    form.append("code", payload.code);
    const shortResp = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST", body: form,
    });
    const shortJson = await shortResp.json();
    if (!shortResp.ok || !shortJson.access_token) {
      console.error("[ig-connect] short token failed:", shortJson);
      return json({ error: "TOKEN_FAILED", message: shortJson?.error_message || "Falha na troca do code" }, 502);
    }
    const shortToken: string = shortJson.access_token;

    // 2) short → long-lived (60 dias)
    const longResp = await fetch(
      `${IG_GRAPH}/access_token?grant_type=ig_exchange_token` +
      `&client_secret=${encodeURIComponent(igAppSecret)}&access_token=${encodeURIComponent(shortToken)}`,
    );
    const longJson = await longResp.json();
    const accessToken: string = longJson?.access_token || shortToken;

    // 3) perfil (user_id + username + account_type)
    const meResp = await fetch(
      `${IG_GRAPH}/me?fields=user_id,username,account_type&access_token=${encodeURIComponent(accessToken)}`,
    );
    const me = await meResp.json();
    if (!meResp.ok || !me?.user_id) {
      console.error("[ig-connect] profile failed:", me);
      return json({ error: "PROFILE_FAILED", message: me?.error?.message || "Falha lendo perfil" }, 502);
    }
    const igId = String(me.user_id);
    const username = me.username ?? null;
    console.log(`[ig-connect] perfil: id=${igId} @${username} account_type=${me.account_type ?? "?"}`);

    // 4) inscreve a conta no webhook (campo messages) e VERIFICA de fato.
    // Sem isso, a Meta NAO entrega DM nenhuma pra esta conta.
    let webhookSubscribed = false;
    try {
      const subResp = await fetch(
        `${IG_GRAPH}/v21.0/me/subscribed_apps?subscribed_fields=messages&access_token=${encodeURIComponent(accessToken)}`,
        { method: "POST" },
      );
      const subBody = await subResp.text();
      console.log(`[ig-connect] subscribe POST status=${subResp.status} body=${subBody}`);
      webhookSubscribed = subResp.ok && subBody.includes("true");

      // Confirma o que a Meta realmente registrou pra esta conta
      const checkResp = await fetch(
        `${IG_GRAPH}/v21.0/me/subscribed_apps?access_token=${encodeURIComponent(accessToken)}`,
      );
      console.log(`[ig-connect] subscribed_apps GET status=${checkResp.status} body=${await checkResp.text()}`);
    } catch (e) { console.warn("[ig-connect] subscribe err:", e); }

    // 5) salva credenciais (limpa page_id/user_token do fluxo antigo)
    const rows = [
      { user_id: user.id, provider: "instagram_access_token", api_key: accessToken },
      { user_id: user.id, provider: "instagram_account_id", api_key: igId },
      { user_id: user.id, provider: "instagram_username", api_key: username || igId },
    ];
    const { error: upErr } = await admin
      .from("user_api_keys").upsert(rows, { onConflict: "user_id,provider" });
    if (upErr) {
      console.error("[ig-connect] save failed:", upErr);
      return json({ error: "SAVE_FAILED", message: "Falha ao salvar credenciais" }, 500);
    }
    await admin.from("user_api_keys").delete()
      .eq("user_id", user.id).in("provider", ["instagram_page_id", "instagram_user_token"]);

    console.log(`[ig-connect] connected user=${user.id} ig=@${username ?? igId} subscribed=${webhookSubscribed}`);
    return json({ connected: true, ig_username: username, webhook_subscribed: webhookSubscribed });
  } catch (e) {
    console.error("[ig-connect] error:", e);
    return json({ error: "INTERNAL", message: (e as Error).message }, 500);
  }
});
