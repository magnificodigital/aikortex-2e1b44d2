// instagram-embedded-signup
// =========================
// Onboarding 1-clique do Instagram: agencia loga com Facebook, autoriza,
// e a gente resolve TUDO server-side — sem colar token/ID manualmente.
//
// Fluxo:
//   1. Frontend: FB.login → { code }  → POST aqui { code }
//   2. Troca code → user access token
//   3. GET /me/accounts (paginas + instagram_business_account)
//      - 0 paginas com IG  → erro amigavel
//      - 1 pagina          → completa direto
//      - varias            → retorna { needs_selection, pages } e guarda o
//        user token temporario; frontend re-POSTa { page_id } pra concluir
//   4. Conclusao: salva page token + IG account id, inscreve a pagina no
//      webhook do app (subscribed_apps: messages) e limpa o token temp.

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

interface IgPage {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: { id: string; username?: string };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const META_APP_ID = Deno.env.get("META_APP_ID");
  const META_APP_SECRET = Deno.env.get("META_APP_SECRET");
  if (!META_APP_ID || !META_APP_SECRET) {
    return json({ error: "MISSING_META_CREDS", message: "META_APP_ID/SECRET ausentes nos secrets" }, 500);
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
      // 1) code → user access token. Codes do fluxo de REDIRECT exigem o
      // mesmo redirect_uri na troca; codes do JS SDK (popup) vem sem ele.
      const redirectPart = payload.redirect_uri
        ? `&redirect_uri=${encodeURIComponent(payload.redirect_uri)}`
        : "";
      const tokenResp = await fetch(
        `${GRAPH_API}/oauth/access_token?client_id=${encodeURIComponent(META_APP_ID)}` +
        `&client_secret=${encodeURIComponent(META_APP_SECRET)}&code=${encodeURIComponent(payload.code)}${redirectPart}`,
      );
      const tokenJson = await tokenResp.json();
      if (!tokenResp.ok || !tokenJson.access_token) {
        console.error("[ig-signup] token exchange failed:", tokenJson);
        return json({ error: "TOKEN_EXCHANGE_FAILED", message: tokenJson?.error?.message || "Falha na troca do code" }, 502);
      }
      userToken = tokenJson.access_token;
    } else if (payload.page_id) {
      // Segunda chamada (escolha de pagina): recupera o user token temporario
      const { data: rows } = await admin
        .from("user_api_keys").select("api_key")
        .eq("user_id", user.id).eq("provider", "instagram_user_token").limit(1);
      userToken = rows?.[0]?.api_key ?? null;
      if (!userToken) return json({ error: "SESSION_EXPIRED", message: "Refaça a conexão" }, 400);
    } else {
      return json({ error: "MISSING_FIELDS", message: "code ou page_id obrigatório" }, 400);
    }

    // 2) Paginas do user com conta IG Business vinculada
    const pagesResp = await fetch(
      `${GRAPH_API}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&limit=50` +
      `&access_token=${encodeURIComponent(userToken!)}`,
    );
    const pagesJson = await pagesResp.json();
    if (!pagesResp.ok) {
      console.error("[ig-signup] pages fetch failed:", pagesJson);
      return json({ error: "PAGES_FETCH_FAILED", message: pagesJson?.error?.message || "Falha listando páginas" }, 502);
    }
    const igPages: IgPage[] = (pagesJson.data ?? []).filter((p: IgPage) => p.instagram_business_account?.id);

    if (igPages.length === 0) {
      return json({
        error: "NO_IG_ACCOUNT",
        message: "Nenhuma conta Instagram Business vinculada às suas Páginas do Facebook. Vincule no app do Instagram (Configurações → Central de Contas) e tente de novo.",
      }, 400);
    }

    // 3) Varias paginas e nenhuma escolhida → guarda token temp + pede escolha
    let chosen: IgPage | undefined;
    if (payload.page_id) {
      chosen = igPages.find((p) => p.id === payload.page_id);
      if (!chosen) return json({ error: "PAGE_NOT_FOUND", message: "Página não encontrada" }, 400);
    } else if (igPages.length === 1) {
      chosen = igPages[0];
    } else {
      await admin.from("user_api_keys").upsert(
        { user_id: user.id, provider: "instagram_user_token", api_key: userToken },
        { onConflict: "user_id,provider" },
      );
      return json({
        needs_selection: true,
        pages: igPages.map((p) => ({
          id: p.id, name: p.name, ig_username: p.instagram_business_account?.username ?? null,
        })),
      });
    }

    const pageToken = chosen.access_token;
    const igAccountId = chosen.instagram_business_account!.id;
    const igUsername = chosen.instagram_business_account!.username ?? null;

    // 4) Inscreve a pagina no webhook do app (campo messages)
    const subResp = await fetch(
      `${GRAPH_API}/${chosen.id}/subscribed_apps?subscribed_fields=messages&access_token=${encodeURIComponent(pageToken)}`,
      { method: "POST" },
    );
    const subJson = await subResp.json();
    if (!subResp.ok) {
      console.error("[ig-signup] subscribe failed:", subJson);
      return json({ error: "SUBSCRIBE_FAILED", message: subJson?.error?.message || "Falha inscrevendo webhook" }, 502);
    }

    // 5) Persiste credenciais + limpa token temporario
    const rows = [
      { user_id: user.id, provider: "instagram_access_token", api_key: pageToken },
      { user_id: user.id, provider: "instagram_account_id", api_key: igAccountId },
      { user_id: user.id, provider: "instagram_page_id", api_key: chosen.id },
    ];
    const { error: upErr } = await admin
      .from("user_api_keys")
      .upsert(rows, { onConflict: "user_id,provider" });
    if (upErr) {
      console.error("[ig-signup] save failed:", upErr);
      return json({ error: "SAVE_FAILED", message: "Falha ao salvar credenciais" }, 500);
    }
    await admin.from("user_api_keys").delete()
      .eq("user_id", user.id).eq("provider", "instagram_user_token");

    console.log(`[ig-signup] connected user=${user.id} ig=@${igUsername ?? igAccountId}`);
    return json({ connected: true, ig_username: igUsername, page_name: chosen.name });
  } catch (e) {
    console.error("[ig-signup] error:", e);
    return json({ error: "INTERNAL", message: (e as Error).message }, 500);
  }
});
