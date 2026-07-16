// Embedded Signup: completa onboarding de WABA a partir do callback do
// Facebook JS SDK. Recebe o `code` (OAuth code) + WABA selecionado pela
// agência, troca por system user access token permanente via Graph API,
// inscreve o WABA no nosso webhook e salva credenciais em user_api_keys.
//
// Fluxo (lado frontend):
//   1. Agência clica "Conectar via Meta"
//   2. FB.login({ config_id, response_type: 'code' }) abre popup Meta
//   3. Agência seleciona/cria WABA, autoriza permissões
//   4. Popup retorna { authResponse: { code }, data: { phone_number_id, waba_id } }
//   5. Frontend POSTa pra essa função com { code, phone_number_id, waba_id }
//   6. Essa função:
//      a. troca code → access_token via /oauth/access_token
//      b. POST /{waba_id}/subscribed_apps → inscreve webhook
//      c. salva token, phone_id, waba_id em user_api_keys
//   7. Frontend mostra "conectado" + identidade da WABA

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GRAPH_API = "https://graph.facebook.com/v21.0";

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * COEXISTÊNCIA — SMB App Data API. Dispara a sincronização de contatos
 * (smb_app_state_sync) ou de histórico (history) do app do celular. Os
 * dados retornam depois via webhook nos campos de mesmo nome.
 */
async function triggerSmbSync(
  phoneNumberId: string,
  accessToken: string,
  syncType: "smb_app_state_sync" | "history",
): Promise<boolean> {
  try {
    const resp = await fetch(`${GRAPH_API}/${phoneNumberId}/smb_app_data`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", sync_type: syncType }),
    });
    const bodyText = await resp.text();
    console.log(`[embedded-signup] smb_app_data ${syncType} status=${resp.status} body=${bodyText}`);
    return resp.ok;
  } catch (e) {
    console.warn(`[embedded-signup] smb_app_data ${syncType} err:`, e);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonRes({ error: "Method not allowed" }, 405);
  }

  const META_APP_ID = Deno.env.get("META_APP_ID");
  const META_APP_SECRET = Deno.env.get("META_APP_SECRET");
  if (!META_APP_ID || !META_APP_SECRET) {
    return jsonRes({
      error: "MISSING_META_CREDS",
      message: "META_APP_ID e META_APP_SECRET precisam estar configurados nos secrets do Supabase",
    }, 500);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Autentica o caller pra associar credenciais ao user correto
  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!jwt) return jsonRes({ error: "UNAUTHORIZED", message: "Missing auth token" }, 401);

  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return jsonRes({ error: "UNAUTHORIZED", message: "Invalid token" }, 401);

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return jsonRes({ error: "INVALID_JSON" }, 400);
  }

  const { code, phone_number_id, waba_id, coexistence } = payload ?? {};
  if (!code || !phone_number_id || !waba_id) {
    return jsonRes({
      error: "MISSING_FIELDS",
      message: "code, phone_number_id e waba_id são obrigatórios",
    }, 400);
  }
  const isCoexistence = coexistence === true;

  try {
    // 1) Troca code por system user access token (permanente quando vem de
    //    Embedded Signup com config configurado pra permanência)
    const tokenUrl = `${GRAPH_API}/oauth/access_token?` +
      `client_id=${encodeURIComponent(META_APP_ID)}&` +
      `client_secret=${encodeURIComponent(META_APP_SECRET)}&` +
      `code=${encodeURIComponent(code)}`;

    const tokenResp = await fetch(tokenUrl, { method: "GET" });
    const tokenJson = await tokenResp.json();
    if (!tokenResp.ok || !tokenJson.access_token) {
      console.error("[embedded-signup] token exchange failed:", tokenResp.status, tokenJson);
      return jsonRes({
        error: "TOKEN_EXCHANGE_FAILED",
        message: tokenJson?.error?.message || "Falha ao trocar code por token",
        details: tokenJson,
      }, 502);
    }
    const accessToken: string = tokenJson.access_token;
    console.log(`[embedded-signup] token exchanged for user=${user.id} waba=${waba_id}`);

    // 2) Inscreve o WABA no webhook do nosso app
    const subscribeResp = await fetch(`${GRAPH_API}/${waba_id}/subscribed_apps`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });
    const subscribeJson = await subscribeResp.json();
    if (!subscribeResp.ok) {
      console.error("[embedded-signup] webhook subscribe failed:", subscribeResp.status, subscribeJson);
      return jsonRes({
        error: "WEBHOOK_SUBSCRIBE_FAILED",
        message: subscribeJson?.error?.message || "Falha ao inscrever webhook no WABA",
        details: subscribeJson,
      }, 502);
    }
    console.log(`[embedded-signup] webhook subscribed for waba=${waba_id}`);

    // 3) Busca metadata do número (display_phone_number, verified_name)
    //    pra mostrar na UI. Não-bloqueante.
    let displayPhone: string | null = null;
    let verifiedName: string | null = null;
    try {
      const metaResp = await fetch(
        `${GRAPH_API}/${phone_number_id}?fields=display_phone_number,verified_name`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (metaResp.ok) {
        const m = await metaResp.json();
        displayPhone = m.display_phone_number ?? null;
        verifiedName = m.verified_name ?? null;
      }
    } catch (e) {
      console.warn("[embedded-signup] phone metadata fetch failed (non-blocking):", e);
    }

    // 4) Persiste credenciais em user_api_keys (mesmo schema que o fluxo manual)
    const upserts = [
      { user_id: user.id, provider: "whatsapp_access_token", api_key: accessToken },
      { user_id: user.id, provider: "whatsapp_phone_number_id", api_key: phone_number_id },
      { user_id: user.id, provider: "whatsapp_business_account_id", api_key: waba_id },
      // Marca o tipo de onboarding: coexistência (app + API) ou Cloud API pura
      { user_id: user.id, provider: "whatsapp_connection_type", api_key: isCoexistence ? "meta_coexistence" : "meta_embedded" },
    ];
    for (const row of upserts) {
      const { error } = await admin
        .from("user_api_keys")
        .upsert(row, { onConflict: "user_id,provider" });
      if (error) {
        console.error("[embedded-signup] upsert failed:", row.provider, error);
        return jsonRes({
          error: "PERSIST_FAILED",
          message: `Falha ao salvar ${row.provider}: ${error.message}`,
        }, 500);
      }
    }
    console.log(`[embedded-signup] credentials persisted for user=${user.id} coexistence=${isCoexistence}`);

    // 5) COEXISTÊNCIA: dispara sync de contatos + histórico (SMB App Data API).
    //    Obrigatório em ate 24h ou a Meta exige re-onboarding. Não-bloqueante —
    //    os dados chegam depois via webhook (history / smb_app_state_sync).
    let syncTriggered: Record<string, boolean> | undefined;
    if (isCoexistence) {
      syncTriggered = {
        contacts: await triggerSmbSync(phone_number_id, accessToken, "smb_app_state_sync"),
        history: await triggerSmbSync(phone_number_id, accessToken, "history"),
      };
    }

    return jsonRes({
      ok: true,
      phone_number_id,
      waba_id,
      display_phone_number: displayPhone,
      verified_name: verifiedName,
      coexistence: isCoexistence,
      sync_triggered: syncTriggered,
    });
  } catch (err) {
    console.error("[embedded-signup] unexpected error:", err);
    return jsonRes({
      error: "INTERNAL_ERROR",
      message: String(err),
    }, 500);
  }
});
