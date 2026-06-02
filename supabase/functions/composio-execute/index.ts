// Executa uma tool Composio em nome do user. Wrapper genérico usado por
// agents que precisam: criar evento no Calendar, enviar email no Gmail, etc.
//
// Body: { toolSlug: "GOOGLECALENDAR_CREATE_EVENT", arguments: {...} }
//
// Composio resolve a connection do user pelo user_id (passado direto).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { executeAction, getAdminClient } from "../_shared/composio.ts";

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

  let body: { toolSlug?: string; arguments?: Record<string, unknown> };
  try { body = await req.json(); } catch {
    return json({ error: "INVALID_JSON" }, 400);
  }

  const toolSlug = String(body.toolSlug ?? "");
  if (!toolSlug) return json({ error: "MISSING_TOOL_SLUG" }, 400);

  try {
    const result = await executeAction(userData.user.id, toolSlug, body.arguments ?? {});
    return json({ result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[composio-execute]", msg);
    return json({ error: "EXECUTION_FAILED", message: msg }, 500);
  }
});
