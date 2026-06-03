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

  const RESERVED = new Set(["agent_id", "table_name", "action", "data", "filter"]);
  let { agent_id, table_name, action, data, filter } = body || {};

  // Tolerance: if the LLM flattened the column fields at the top level,
  // reconstruct `data` (for insert/update) from the non-reserved keys.
  if (!data && (action === "insert" || action === "update")) {
    const flatFields: Record<string, any> = {};
    for (const [key, value] of Object.entries(body || {})) {
      if (!RESERVED.has(key)) flatFields[key] = value;
    }
    if (Object.keys(flatFields).length > 0) {
      data = flatFields;
      console.log(`[tool-table-write] auto-reconstructed data from flat payload: ${JSON.stringify(data)}`);
    }
  }

  console.log(
    `[tool-table-write] action=${action} table=${table_name} hasData=${!!data} dataKeys=${data ? Object.keys(data).join(",") : "none"} hasFilter=${!!filter}`,
  );

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

    // ── Auto-popular CRM ──────────────────────────────────────────────
    // Se a tabela parece ser de leads/contatos/clientes (heurística por
    // nome), espelha o registro pra crm_contacts pra aparecer no CRM nativo.
    try {
      const isCrmTable = /^(leads?|contatos?|contacts?|clientes?|customers?|prospects?)$/i.test(table.name);
      if (isCrmTable) {
        const d = data as Record<string, unknown>;
        // Resolve agency_id do agente
        const { data: agentDetail } = await admin
          .from("user_agents")
          .select("id, user_id")
          .eq("id", agent_id)
          .maybeSingle();
        const { data: agency } = await admin
          .from("agency_profiles")
          .select("id")
          .eq("user_id", (agentDetail as { user_id?: string } | null)?.user_id ?? "")
          .maybeSingle();
        if ((agency as { id?: string } | null)?.id) {
          const pickStr = (...keys: string[]) => {
            for (const k of keys) {
              const v = d[k];
              if (typeof v === "string" && v.trim()) return v.trim();
            }
            return null;
          };
          const contact = {
            agency_id: (agency as { id: string }).id,
            client_id: (agent as { client_id?: string } | null)?.client_id ?? null,
            name: pickStr("nome", "name", "lead", "cliente"),
            email: pickStr("email", "e-mail"),
            phone: pickStr("telefone", "phone", "celular", "whatsapp"),
            company: pickStr("empresa", "company"),
            role: pickStr("cargo", "role", "position"),
            budget: pickStr("budget", "orcamento", "investimento"),
            authority: pickStr("authority", "autoridade", "decisor"),
            need: pickStr("need", "necessidade", "dor"),
            timeline: pickStr("timeline", "prazo"),
            notes: pickStr("notas", "notes", "observacoes"),
            stage_slug: pickStr("stage", "estagio", "status") ?? "new",
            temperature: ["hot", "warm", "cold"].includes(String(d.temperature ?? "").toLowerCase())
              ? String(d.temperature).toLowerCase()
              : null,
            primary_agent_id: agent_id,
            client_table_row_id: (row as { id?: string } | null)?.id ?? null,
            custom_fields: d,
            last_interaction_at: new Date().toISOString(),
          };
          const { data: createdContact, error: contactErr } = await admin
            .from("crm_contacts")
            .insert(contact)
            .select("id")
            .single();
          if (contactErr) {
            console.warn("[tool-table-write] CRM contact insert failed:", contactErr.message);
          } else if ((createdContact as { id?: string } | null)?.id) {
            // Loga a interação inicial
            await admin.from("crm_interactions").insert({
              contact_id: (createdContact as { id: string }).id,
              agency_id: (agency as { id: string }).id,
              agent_id,
              type: "tool_called",
              channel: null,
              content: `Lead criado pelo agente via tabela "${table.name}".`,
              metadata: { action: "insert", table_name: table.name, fields: Object.keys(d) },
            });
          }
        }
      }
    } catch (e) {
      console.warn("[tool-table-write] CRM auto-populate failed (non-fatal):", e);
    }
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
