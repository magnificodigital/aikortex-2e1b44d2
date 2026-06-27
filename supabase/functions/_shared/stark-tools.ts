// Tools que o Stark expõe pro LLM via tool calling.
//
// Princípios:
// - Genéricas (não específicas por tipo de agente)
// - Read-only nesta Fase 1 (writes vêm na Fase 2)
// - Cada tool roda com client autenticado do USER → RLS auto-filtra
// - Sempre retornam dados reais; NUNCA inventar — se vazio, dizer vazio
//
// Stark consulta via period filters padronizados:
//   "today" | "yesterday" | "this_week" | "last_week"
//   | "this_month" | "last_month" | "last_7_days" | "last_30_days"

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

/** Schema OpenAI/Anthropic-compatible das tools. LLM le isso pra saber o que existe. */
export const STARK_TOOL_DEFS = [
  {
    name: "list_agents",
    description: "Lista agentes do user (qualquer tipo: SDR, SAC, CS, BDR, Custom). Use quando user pergunta 'meus agentes', 'quais agentes tenho', ou precisa de IDs pra outras tools.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", description: "Filtro opcional por tipo (SDR/SAC/CS/BDR/Custom)" },
        published_only: { type: "boolean", description: "Se true, só agentes publicados (com cobrança ativa)" },
      },
    },
  },
  {
    name: "describe_agent",
    description: "Detalhes completos de um agente: tipo, role, objetivo, outcomes trackeados, status. Use depois de list_agents ou quando user menciona um agente por nome.",
    input_schema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "UUID do agente" },
      },
      required: ["agent_id"],
    },
  },
  {
    name: "count_outcomes",
    description: "Conta quantas vezes um outcome aconteceu em conversas/chamadas. Ex: 'qualified' do SDR, 'resolved' do SAC, 'meeting_booked' do BDR. Use sempre que user perguntar 'quantas/quantos X o agente Y fez no período Z'.",
    input_schema: {
      type: "object",
      properties: {
        agent_id: { type: "string", description: "UUID do agente (opcional — sem isso conta todos)" },
        outcome_tag: { type: "string", description: "Tag do outcome (qualified, resolved, meeting_booked, escalated, renewed, no_show, etc.)" },
        period: { type: "string", enum: ["today", "yesterday", "this_week", "last_week", "this_month", "last_month", "last_7_days", "last_30_days"] },
      },
      required: ["outcome_tag", "period"],
    },
  },
  {
    name: "query_messages",
    description: "Volume e detalhes de mensagens trocadas. Use pra 'quantas conversas hoje', 'mensagens recebidas essa semana', etc.",
    input_schema: {
      type: "object",
      properties: {
        agent_id: { type: "string" },
        period: { type: "string", enum: ["today", "yesterday", "this_week", "last_week", "this_month", "last_month", "last_7_days", "last_30_days"] },
        channel: { type: "string", description: "whatsapp, email, web, voice (opcional)" },
        only_count: { type: "boolean", description: "Se true, só retorna a contagem (mais barato)" },
      },
      required: ["period"],
    },
  },
  {
    name: "query_calls",
    description: "Chamadas de voz no período. Status, duração média, total. Use pra 'quantas ligações o agente atendeu', 'duração média das chamadas', etc.",
    input_schema: {
      type: "object",
      properties: {
        agent_id: { type: "string" },
        period: { type: "string", enum: ["today", "yesterday", "this_week", "last_week", "this_month", "last_month", "last_7_days", "last_30_days"] },
        status: { type: "string", description: "Filtro opcional: completed, no_answer, failed" },
      },
      required: ["period"],
    },
  },
  {
    name: "query_revenue",
    description: "Receita da agência (Aikortex Split). Bruto cobrado, parte da agência, comissão Aikortex. Use pra 'qual minha receita', 'quanto recebi', 'MRR'.",
    input_schema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["today", "yesterday", "this_week", "last_week", "this_month", "last_month", "last_7_days", "last_30_days", "all_time"] },
      },
      required: ["period"],
    },
  },
  {
    name: "query_cadences",
    description: "Cadências da agência: ativas, pausadas, total. Use pra 'minhas cadências', 'quais ativas'.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", description: "active, paused, draft (opcional)" },
      },
    },
  },
];

// ─── Implementações ────────────────────────────────────────────────────────

interface ToolContext {
  /** Client autenticado do user — RLS filtra resultado automaticamente. */
  supa: SupabaseClient;
  userId: string;
}

/** Resolve filtro period → { from, to } ISO timestamps. */
function resolvePeriod(period: string): { from: Date | null; to: Date | null } {
  const now = new Date();
  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
  const startOfWeek = (d: Date) => { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); return startOfDay(x); };
  const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

  switch (period) {
    case "today":         return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "this_week":     return { from: startOfWeek(now), to: endOfDay(now) };
    case "last_week": {
      const w = new Date(now); w.setDate(w.getDate() - 7);
      const from = startOfWeek(w);
      const to = new Date(from); to.setDate(to.getDate() + 6); endOfDay(to);
      return { from, to: endOfDay(to) };
    }
    case "this_month":    return { from: startOfMonth(now), to: endOfDay(now) };
    case "last_month": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from, to: endOfDay(to) };
    }
    case "last_7_days": {
      const from = new Date(now); from.setDate(from.getDate() - 7);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    case "last_30_days": {
      const from = new Date(now); from.setDate(from.getDate() - 30);
      return { from: startOfDay(from), to: endOfDay(now) };
    }
    case "all_time":      return { from: null, to: null };
    default:              return { from: startOfDay(now), to: endOfDay(now) };
  }
}

export async function executeTool(name: string, args: any, ctx: ToolContext): Promise<any> {
  switch (name) {
    case "list_agents": return toolListAgents(args, ctx);
    case "describe_agent": return toolDescribeAgent(args, ctx);
    case "count_outcomes": return toolCountOutcomes(args, ctx);
    case "query_messages": return toolQueryMessages(args, ctx);
    case "query_calls": return toolQueryCalls(args, ctx);
    case "query_revenue": return toolQueryRevenue(args, ctx);
    case "query_cadences": return toolQueryCadences(args, ctx);
    default: return { error: "unknown_tool", message: `Tool ${name} não reconhecida` };
  }
}

async function toolListAgents(args: any, { supa, userId }: ToolContext) {
  let q = supa.from("user_agents").select("id, name, agent_type, published_at, subscription_status").eq("user_id", userId).order("name");
  if (args.type) q = q.eq("agent_type", args.type);
  if (args.published_only === true) q = q.not("published_at", "is", null);
  const { data, error } = await q;
  if (error) return { error: error.message };
  return { count: data?.length || 0, agents: data || [] };
}

async function toolDescribeAgent(args: any, { supa }: ToolContext) {
  if (!args.agent_id) return { error: "missing_agent_id" };
  const { data, error } = await supa
    .from("user_agents")
    .select("id, name, agent_type, config, published_at, client_subscription_id, subscription_status")
    .eq("id", args.agent_id)
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "agent_not_found" };
  const cfg = (data as any).config || {};
  return {
    id: data.id,
    name: data.name,
    type: (data as any).agent_type,
    objective: cfg.objective || cfg.profile?.primaryGoal || "",
    tone: cfg.toneOfVoice || cfg.businessContext?.toneOfVoice || "",
    tracked_outcomes: cfg.tracked_outcomes || [],
    published: !!data.published_at,
    subscription_status: (data as any).subscription_status,
  };
}

async function toolCountOutcomes(args: any, { supa, userId }: ToolContext) {
  if (!args.outcome_tag) return { error: "missing_outcome_tag" };
  const { from, to } = resolvePeriod(args.period);

  // Conta nas duas tabelas: conversations e call_logs.
  const counts = { conversations: 0, calls: 0 };

  // conversations: filtra via JOIN com user_agents (agency_id ja eh RLS-protected)
  let convQ = supa
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .contains("outcome_tags", [args.outcome_tag]);
  if (args.agent_id) convQ = convQ.eq("agent_id", args.agent_id);
  if (from) convQ = convQ.gte("created_at", from.toISOString());
  if (to) convQ = convQ.lte("created_at", to.toISOString());
  const { count: convCount } = await convQ;
  counts.conversations = convCount || 0;

  // call_logs: filtra por user_id (RLS ja faz isso, mas explicito por seguranca)
  let callQ = supa
    .from("call_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .contains("outcome_tags", [args.outcome_tag]);
  if (args.agent_id) callQ = callQ.eq("agent_id", args.agent_id);
  if (from) callQ = callQ.gte("created_at", from.toISOString());
  if (to) callQ = callQ.lte("created_at", to.toISOString());
  const { count: callCount } = await callQ;
  counts.calls = callCount || 0;

  return {
    outcome_tag: args.outcome_tag,
    period: args.period,
    total: counts.conversations + counts.calls,
    by_source: counts,
  };
}

async function toolQueryMessages(args: any, { supa, userId }: ToolContext) {
  const { from, to } = resolvePeriod(args.period);

  let q = supa
    .from("conversations")
    .select(args.only_count ? "id" : "id, agent_id, channel, status, last_message_preview, last_message_at, outcome_tags", { count: "exact", head: !!args.only_count })
    .order("last_message_at", { ascending: false });
  if (args.agent_id) q = q.eq("agent_id", args.agent_id);
  if (args.channel) q = q.eq("channel", args.channel);
  if (from) q = q.gte("created_at", from.toISOString());
  if (to) q = q.lte("created_at", to.toISOString());

  const { data, count, error } = await q.limit(20);
  if (error) return { error: error.message };
  return {
    period: args.period,
    count: count ?? data?.length ?? 0,
    sample: args.only_count ? null : (data || []).slice(0, 20),
  };
}

async function toolQueryCalls(args: any, { supa, userId }: ToolContext) {
  const { from, to } = resolvePeriod(args.period);

  let q = supa.from("call_logs").select("id, agent_id, direction, status, duration_seconds, started_at").eq("user_id", userId).order("started_at", { ascending: false });
  if (args.agent_id) q = q.eq("agent_id", args.agent_id);
  if (args.status) q = q.eq("status", args.status);
  if (from) q = q.gte("started_at", from.toISOString());
  if (to) q = q.lte("started_at", to.toISOString());

  const { data, error } = await q.limit(50);
  if (error) return { error: error.message };
  const total = data?.length || 0;
  const completed = data?.filter((d: any) => d.status === "completed") || [];
  const avgDuration = completed.length > 0
    ? completed.reduce((s: number, d: any) => s + (d.duration_seconds || 0), 0) / completed.length
    : 0;
  return {
    period: args.period,
    total,
    completed_count: completed.length,
    avg_duration_seconds: Math.round(avgDuration),
    sample: (data || []).slice(0, 10),
  };
}

async function toolQueryRevenue(args: any, { supa, userId }: ToolContext) {
  const { from, to } = resolvePeriod(args.period);

  let q = supa
    .from("agent_billing_events")
    .select("gross_amount_cents, agency_amount_cents, platform_amount_cents, event_type, created_at, agent_id")
    .eq("agency_user_id", userId);
  if (from) q = q.gte("created_at", from.toISOString());
  if (to) q = q.lte("created_at", to.toISOString());

  const { data, error } = await q;
  if (error) return { error: error.message };

  const events = data || [];
  const totals = events.reduce(
    (acc, e: any) => {
      acc.gross += e.gross_amount_cents || 0;
      acc.agency += e.agency_amount_cents || 0;
      acc.platform += e.platform_amount_cents || 0;
      if (e.event_type === "PAYMENT_CONFIRMED" || e.event_type === "PAYMENT_RECEIVED") acc.confirmed_count++;
      return acc;
    },
    { gross: 0, agency: 0, platform: 0, confirmed_count: 0 },
  );

  return {
    period: args.period,
    confirmed_payments: totals.confirmed_count,
    gross_brl: totals.gross / 100,
    agency_brl: totals.agency / 100,
    platform_brl: totals.platform / 100,
  };
}

async function toolQueryCadences(args: any, { supa, userId }: ToolContext) {
  let q = supa.from("user_cadences").select("id, name, agent_id, status, next_run_at").eq("user_id", userId);
  if (args.status) q = q.eq("status", args.status);
  const { data, error } = await q;
  if (error) return { error: error.message };
  return {
    count: data?.length || 0,
    cadences: data || [],
  };
}
