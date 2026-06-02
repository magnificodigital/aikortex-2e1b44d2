// Inicia conexão de um toolkit Composio pro user autenticado.
// Substitui google-oauth-start: agora Composio gerencia OAuth de TODOS os providers.
//
// Body: { provider: "google_calendar" | "gmail" | ... , agentId?: string }
// Resp: { redirectUrl, connectedAccountId, provider, toolkit }
//
// Frontend abre redirectUrl em popup. Após OAuth, polling em composio-status
// detecta status=ACTIVE e finaliza.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { getAdminClient, initiateConnection, providerToToolkit } from "../_shared/composio.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!jwt) return json({ error: "UNAUTHORIZED" }, 401);

  const admin = getAdminClient();
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) return json({ error: "INVALID_TOKEN" }, 401);

  let body: { provider?: string; agentId?: string };
  try { body = await req.json(); } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }

  const provider = String(body.provider ?? "");
  const toolkit = providerToToolkit(provider);
  if (!toolkit) {
    return json({ error: "UNSUPPORTED_PROVIDER", provider }, 400);
  }

  console.log(`[composio-connect] start provider=${provider} toolkit=${toolkit} user=${userData.user.id}`);
  console.log(`[composio-connect] COMPOSIO_API_KEY present?`, !!Deno.env.get("COMPOSIO_API_KEY"));

  try {
    const result = await initiateConnection(admin, userData.user.id, toolkit);
    console.log(`[composio-connect] OK redirectUrl=${result.redirectUrl?.slice(0, 80)}... id=${result.connectedAccountId} status=${result.status}`);

    // Registra placeholder em user_api_keys pra agent-vibe-mutate detectar
    // que o user está tentando conectar. api_key será preenchida só quando
    // ACTIVE (composio-status faz isso).
    await admin.from("user_api_keys").upsert(
      {
        user_id: userData.user.id,
        provider,
        api_key: JSON.stringify({
          composio_connected_account_id: result.connectedAccountId,
          status: result.status,
          pending: true,
        }),
      },
      { onConflict: "user_id,provider" },
    );

    return json({
      redirectUrl: result.redirectUrl,
      connectedAccountId: result.connectedAccountId,
      provider,
      toolkit,
      status: result.status,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("[composio-connect] FAIL", msg);
    if (stack) console.error("[composio-connect] stack", stack);
    return json({ error: "COMPOSIO_ERROR", message: msg, stage: "initiate" }, 500);
  }
});
