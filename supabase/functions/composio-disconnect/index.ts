// Remove conexão Composio do user pra um provider.
// Body: { provider: "google_calendar" | ... }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { disconnectAccount, getAdminClient, getConnectionStatus, providerToToolkit } from "../_shared/composio.ts";

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

  let body: { provider?: string };
  try { body = await req.json(); } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }

  const provider = String(body.provider ?? "");
  const toolkit = providerToToolkit(provider);
  if (!toolkit) return json({ error: "UNSUPPORTED_PROVIDER" }, 400);

  const userId = userData.user.id;

  try {
    // Pega o connected_account_id atual via Composio (mais confiável que ler do DB)
    const status = await getConnectionStatus(userId, toolkit);
    if (status.connectedAccountId) {
      try { await disconnectAccount(status.connectedAccountId); } catch (e) {
        console.warn("[composio-disconnect] falha no Composio (continuando):", e);
      }
    }

    // Remove do DB local
    await admin
      .from("user_api_keys")
      .delete()
      .eq("user_id", userId)
      .eq("provider", provider);

    return json({ ok: true, provider });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[composio-disconnect]", msg);
    return json({ error: "COMPOSIO_ERROR", message: msg }, 500);
  }
});
