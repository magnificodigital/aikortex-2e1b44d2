// facebook-connect
// ================
// Conexao do Facebook Messenger (Login do Facebook + Pagina). Canal
// PROPRIO, separado do Instagram. Aqui SIM entram pages_messaging /
// pages_manage_metadata — as permissoes de Pagina vivem no canal certo.
//
// Fluxo (redirect, sem popup):
//   1. Frontend → facebook.com/dialog/oauth (config_id do FB Login for
//      Business com pages_messaging) → volta ?code&state=fb_connect
//   2. POST { code, redirect_uri } → troca por user token
//   3. /me/accounts → Paginas. 1 → conclui; varias → seletor
//   4. salva facebook_page_id + facebook_page_token; subscribe messages

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const GRAPH_API = "https://graph.facebook.com/v21.0";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const META_APP_ID = Deno.env.get("META_APP_ID");
  const META_APP_SECRET = Deno.env.get("META_APP_SECRET");
  if (!META_APP_ID || !META_APP_SECRET) {
    return json({ error: "MISSING_META_CREDS" }, 500);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const { data: { user }, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !user) return json({ error: "UNAUTHORIZED" }, 401);

  let payload: { code?: string; page_id?: string; redirect_uri?: string };
  try { payload = await req.json(); } catch { return json({ error: "INVALID_JSON" }, 400); }

  try {
    let userToken: string | null = null;
    if (payload.code) {
      const redirectPart = payload.redirect_uri ? `&redirect_uri=${encodeURIComponent(payload.redirect_uri)}` : "";
      const tokenResp = await fetch(
        `${GRAPH_API}/oauth/access_token?client_id=${encodeURIComponent(META_APP_ID)}` +
        `&client_secret=${encodeURIComponent(META_APP_SECRET)}&code=${encodeURIComponent(payload.code)}${redirectPart}`,
      );
      const tj = await tokenResp.json();
      if (!tokenResp.ok || !tj.access_token) {
        return json({ error: "TOKEN_FAILED", message: tj?.error?.message || "Falha na troca do code" }, 502);
      }
      userToken = tj.access_token;
    } else if (payload.page_id) {
      const { data: rows } = await admin
        .from("user_api_keys").select("api_key")
        .eq("user_id", user.id).eq("provider", "facebook_user_token").limit(1);
      userToken = rows?.[0]?.api_key ?? null;
      if (!userToken) return json({ error: "SESSION_EXPIRED", message: "Refaça a conexão" }, 400);
    } else {
      return json({ error: "MISSING_FIELDS" }, 400);
    }

    const pagesResp = await fetch(
      `${GRAPH_API}/me/accounts?fields=id,name,access_token&limit=50&access_token=${encodeURIComponent(userToken!)}`,
    );
    const pagesJson = await pagesResp.json();
    if (!pagesResp.ok) {
      return json({ error: "PAGES_FAILED", message: pagesJson?.error?.message || "Falha listando páginas" }, 502);
    }
    const pages: { id: string; name: string; access_token: string }[] = pagesJson.data ?? [];
    if (pages.length === 0) {
      return json({ error: "NO_PAGE", message: "Nenhuma Página do Facebook encontrada na sua conta." }, 400);
    }

    let chosen: { id: string; name: string; access_token: string } | undefined;
    if (payload.page_id) {
      chosen = pages.find((p) => p.id === payload.page_id);
      if (!chosen) return json({ error: "PAGE_NOT_FOUND" }, 400);
    } else if (pages.length === 1) {
      chosen = pages[0];
    } else {
      await admin.from("user_api_keys").upsert(
        { user_id: user.id, provider: "facebook_user_token", api_key: userToken },
        { onConflict: "user_id,provider" },
      );
      return json({ needs_selection: true, pages: pages.map((p) => ({ id: p.id, name: p.name })) });
    }

    // Inscreve a Pagina no webhook (campo messages)
    let webhookSubscribed = false;
    try {
      const sub = await fetch(
        `${GRAPH_API}/${chosen.id}/subscribed_apps?subscribed_fields=messages&access_token=${encodeURIComponent(chosen.access_token)}`,
        { method: "POST" },
      );
      webhookSubscribed = sub.ok;
      if (!sub.ok) console.warn("[fb-connect] subscribe:", await sub.text());
    } catch (e) { console.warn("[fb-connect] subscribe err:", e); }

    const rows = [
      { user_id: user.id, provider: "facebook_page_token", api_key: chosen.access_token },
      { user_id: user.id, provider: "facebook_page_id", api_key: chosen.id },
    ];
    const { error: upErr } = await admin
      .from("user_api_keys").upsert(rows, { onConflict: "user_id,provider" });
    if (upErr) return json({ error: "SAVE_FAILED" }, 500);
    await admin.from("user_api_keys").delete()
      .eq("user_id", user.id).eq("provider", "facebook_user_token");

    console.log(`[fb-connect] connected user=${user.id} page=${chosen.name} subscribed=${webhookSubscribed}`);
    return json({ connected: true, page_name: chosen.name, webhook_subscribed: webhookSubscribed });
  } catch (e) {
    console.error("[fb-connect] error:", e);
    return json({ error: "INTERNAL", message: (e as Error).message }, 500);
  }
});
