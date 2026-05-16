// Sprint 2.6-c — Tool: table_read (consulta linhas em client_tables)
// Auth modes: A) end-user JWT (chat flow), B) service-role (webhooks)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: any;
  try { body = await req.json(); } catch { return jsonError(400, "Invalid JSON"); }

  const RESERVED = new Set(["agent_id", "table_name", "filter", "limit", "top_k"]);
  let { agent_id, table_name, filter, limit = 10 } = body || {};

  // Tolerance: if the LLM put filter keys at the top instead of inside `filter`,
  // assemble a filter object from non-reserved fields.
  if (!filter || (typeof filter === "object" && Object.keys(filter).length === 0)) {
    const flat: Record<string, any> = {};
    for (const [key, value] of Object.entries(body || {})) {
      if (!RESERVED.has(key)) flat[key] = value;
    }
    if (Object.keys(flat).length > 0) {
      filter = flat;
      console.log(`[tool-table-read] auto-reconstructed filter from flat payload: ${JSON.stringify(filter)}`);
    }
  }

  console.log(
    `[tool-table-read] table=${table_name} hasFilter=${!!filter && Object.keys(filter || {}).length > 0} filterKeys=${filter ? Object.keys(filter).join(",") : "none"} limit=${limit}`,
  );

  if (!agent_id || !table_name) return jsonError(400, "agent_id and table_name required");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const authHeader = req.headers.get("Authorization") ?? "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  const isServiceRole = serviceKey.length > 0 && bearerToken === serviceKey;

  const { data: agent } = await admin
    .from("user_agents")
    .select("id, user_id, client_id")
    .eq("id", agent_id)
    .maybeSingle();
  if (!agent) return jsonError(404, "Agent not found");
  if (!agent.client_id) return jsonError(400, "Agent has no client assigned");

  if (!isServiceRole) {
    if (!bearerToken) return jsonError(401, "Missing Authorization");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearerToken}` } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(bearerToken);
    if (claimsErr || !claims?.claims?.sub) return jsonError(401, "Invalid JWT");
    if ((agent as any).user_id !== claims.claims.sub) return jsonError(403, "No permission");
  }

  const { data: table } = await admin
    .from("client_tables")
    .select("id, name, enabled")
    .eq("client_id", agent.client_id)
    .eq("name", table_name)
    .maybeSingle();

  if (!table) {
    return new Response(JSON.stringify({
      results: [],
      formatted: `Tabela "${table_name}" não existe neste cliente.`,
      total_matches: 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  if (!table.enabled) {
    return new Response(JSON.stringify({
      results: [],
      formatted: `Tabela "${table_name}" está desabilitada.`,
      total_matches: 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
  let query = admin
    .from("client_table_rows")
    .select("id, data, created_at, updated_at")
    .eq("table_id", table.id)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (filter && typeof filter === "object" && Object.keys(filter).length > 0) {
    query = query.contains("data", filter);
  }

  const { data: rows, error } = await query;
  if (error) return jsonError(500, `Query failed: ${error.message}`);

  const formattedRows = (rows ?? []).map((r: any) => r.data);
  const formatted = formattedRows.length > 0
    ? `Encontrados ${formattedRows.length} registro(s) em ${table.name}:\n` +
      formattedRows.map((r: any, i: number) => `${i + 1}. ${JSON.stringify(r)}`).join("\n")
    : `Nenhum registro encontrado em ${table.name} com os filtros fornecidos.`;

  return new Response(JSON.stringify({
    results: formattedRows,
    formatted,
    total_matches: formattedRows.length,
    table_name: table.name,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
