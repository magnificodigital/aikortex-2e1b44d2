// Verifica status de conexão Composio pro user autenticado.
// Usado por polling do InlineComposioButton e IntegrationsGrid.
//
// Body: { provider: "google_calendar" | ... }  -> verifica 1 provider
//       { providers: ["..."] }                  -> verifica vários de uma vez
//
// Quando detecta ACTIVE, atualiza user_api_keys removendo pending.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getAdminClient, getConnectionStatus, providerToToolkit, type ConnectionStatus } from "../_shared/composio.ts";

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

type Result = ConnectionStatus & { provider: string; toolkit: string | null };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!jwt) return json({ error: "UNAUTHORIZED" }, 401);

  const admin = getAdminClient();
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData?.user) return json({ error: "INVALID_TOKEN" }, 401);

  let body: { provider?: string; providers?: string[] };
  try { body = await req.json(); } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }

  const providers = body.providers ?? (body.provider ? [body.provider] : []);
  if (providers.length === 0) {
    return json({ error: "MISSING_PROVIDER" }, 400);
  }

  const userId = userData.user.id;
  const results: Result[] = [];

  for (const provider of providers) {
    const toolkit = providerToToolkit(provider);
    if (!toolkit) {
      results.push({ provider, toolkit: null, connected: false, connectedAccountId: null, status: "UNSUPPORTED" });
      continue;
    }

    try {
      const status = await getConnectionStatus(userId, toolkit);
      results.push({ provider, toolkit, ...status });

      // Sincroniza user_api_keys: se ACTIVE, marca como connected (api_key = blob).
      // Se não tem nada e estava pending, deleta.
      if (status.connected && status.connectedAccountId) {
        await admin.from("user_api_keys").upsert(
          {
            user_id: userId,
            provider,
            api_key: JSON.stringify({
              composio_connected_account_id: status.connectedAccountId,
              status: status.status,
              connected_via: "composio",
            }),
          },
          { onConflict: "user_id,provider" },
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[composio-status] ${provider}:`, msg);
      results.push({ provider, toolkit, connected: false, connectedAccountId: null, status: "ERROR" });
    }
  }

  // Compat: se 1 provider, retorna result direto + array
  if (results.length === 1) {
    return json({ ...results[0], results });
  }
  return json({ results });
});
