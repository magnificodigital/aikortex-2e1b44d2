// Sprint 2.6-c — Tool: table_write (insert/update/delete em client_table_rows)
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

  const { agent_id, table_name, action, data, filter } = body || {};
  if (!agent_id || !table_name || !action) return jsonError(400, "Missing required fields");
  if (!["insert", "update", "delete"].includes(action)) return jsonError(400, "Invalid action");

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
  if (!table) return jsonError(404, `Table "${table_name}" not found`);
  if (!table.enabled) return jsonError(400, `Table "${table_name}" is disabled`);

  let result: any;
  let formatted: string;

  if (action === "insert") {
    if (!data || typeof data !== "object") return jsonError(400, "data required for insert");
    const { data: row, error } = await admin
      .from("client_table_rows")
      .insert({ table_id: table.id, data })
      .select()
      .single();
    if (error) return jsonError(500, error.message);
    result = { inserted: 1, row };
    formatted = `Cadastrei 1 registro em ${table.name}.`;
  } else if (action === "update") {
    if (!filter || typeof filter !== "object" || Object.keys(filter).length === 0) {
      return jsonError(400, "filter required for update");
    }
    if (!data || typeof data !== "object") return jsonError(400, "data required for update");

    const { data: matched } = await admin
      .from("client_table_rows")
      .select("id, data")
      .eq("table_id", table.id)
      .contains("data", filter);

    if (!matched || matched.length === 0) {
      return new Response(JSON.stringify({
        success: true, updated: 0,
        formatted: `Nenhum registro encontrado em ${table.name} com o filtro fornecido.`,
        table_name: table.name,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await Promise.all(matched.map((row: any) => {
      const newData = { ...(row.data as object), ...data };
      return admin.from("client_table_rows").update({ data: newData }).eq("id", row.id);
    }));
    result = { updated: matched.length };
    formatted = `Atualizei ${matched.length} registro(s) em ${table.name}.`;
  } else {
    // delete
    if (!filter || typeof filter !== "object" || Object.keys(filter).length === 0) {
      return jsonError(400, "filter required for delete");
    }
    const { data: matched } = await admin
      .from("client_table_rows")
      .select("id")
      .eq("table_id", table.id)
      .contains("data", filter);

    if (!matched || matched.length === 0) {
      return new Response(JSON.stringify({
        success: true, deleted: 0,
        formatted: `Nenhum registro para deletar em ${table.name} com o filtro fornecido.`,
        table_name: table.name,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { error } = await admin
      .from("client_table_rows")
      .delete()
      .in("id", matched.map((r: any) => r.id));
    if (error) return jsonError(500, error.message);
    result = { deleted: matched.length };
    formatted = `Removi ${matched.length} registro(s) em ${table.name}.`;
  }

  return new Response(JSON.stringify({
    success: true, ...result, formatted, table_name: table.name,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
