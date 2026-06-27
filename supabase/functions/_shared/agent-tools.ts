// ── Sprint 2.4-a: Agent Tools runtime (Aikortex Master v7.4 §13.15) ──
// Function-calling helper shared by all LLM call sites.

import { callLLM } from "./llm-fallback.ts";
import { applyToolsHints } from "./agent-runtime.ts";

export type ToolKey = "web_search" | "image_gen" | "knowledge_search" | "table_read" | "table_write" | "send_email" | "create_calendar_event";

// Alinhado ao Master v7.4 §3.2
export interface ToolQuota {
  start: number;
  hack: number;
  growth: number;
}

export interface ToolDefinition {
  key: ToolKey;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  quotas: ToolQuota;
}

export const TOOL_CATALOG: Record<ToolKey, ToolDefinition> = {
  web_search: {
    key: "web_search",
    name: "web_search",
    description:
      "Pesquisa na web em tempo real via Brave Search. Use para fatos recentes, notícias, preços, dados que mudam frequentemente. Retorna até 5 resultados com título, snippet e URL.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Consulta de busca em linguagem natural." },
        count: { type: "integer", description: "Número de resultados (1-10).", default: 5 },
      },
      required: ["query"],
    },
    quotas: { start: 50, hack: 200, growth: 1000 },
  },
  image_gen: {
    key: "image_gen",
    name: "image_gen",
    description:
      "Gera uma imagem a partir de um prompt textual via OpenRouter (Nano Banana). Retorna URL pública (ou data URL) da imagem.",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Descrição detalhada da imagem desejada." },
        aspect_ratio: {
          type: "string",
          enum: ["1:1", "16:9", "9:16", "4:3", "3:4"],
          description: "Proporção da imagem.",
          default: "1:1",
        },
      },
      required: ["prompt"],
    },
    quotas: { start: 50, hack: 100, growth: 500 },
  },
  knowledge_search: {
    key: "knowledge_search",
    name: "knowledge_search",
    description:
      "Search the agent knowledge base for relevant information. Use this tool whenever the user asks about products, services, prices, procedures, policies, FAQs, or any factual information that may be in the documents provided to this agent. The KB contains documents specifically curated for this agent and is more reliable than general knowledge for context-specific questions.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query in natural language, ideally including key terms from the user question.",
        },
        top_k: {
          type: "number",
          description: "Number of relevant chunks to retrieve. Default 5, max 10.",
          default: 5,
        },
      },
      required: ["query"],
    },
    quotas: { start: -1, hack: -1, growth: -1 },
  },
  table_read: {
    key: "table_read",
    name: "table_read",
    description:
      `Read rows from a client table.

CRITICAL JSON FORMAT:
- table_name: string (exact table name, case-sensitive)
- filter: OBJECT with column key-value pairs (do NOT spread filter fields at the top level)
- limit: number (optional, default 10, max 50)

Example:
{
  "table_name": "Pacientes",
  "filter": { "nome": "Maria" },
  "limit": 10
}`,
    parameters: {
      type: "object",
      properties: {
        table_name: { type: "string", description: "Exact name of the table (case-sensitive, e.g. 'Pacientes')" },
        filter: { type: "object", description: "Filter as key-value object. Example: {\"nome\": \"Maria\"}. NEVER put filter values at the top level.", additionalProperties: true },
        limit: { type: "number", description: "Max rows to return. Default 10, max 50.", default: 10 },
      },
      required: ["table_name"],
    },
    quotas: { start: -1, hack: -1, growth: -1 },
  },
  send_email: {
    key: "send_email",
    name: "send_email",
    description:
      `Envia um email REAL via Resend (Aikortex/agency). Use sempre que disser ao user que vai mandar email (confirmação, convite, follow-up). Quando você chama essa tool, o email é entregue de verdade.

NUNCA diga "vou enviar o email" sem chamar essa tool — alucinação. Se a tool retornar erro, comunique o erro ao user honestamente.`,
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "Email do destinatário (validado pelo Resend)." },
        subject: { type: "string", description: "Assunto do email." },
        body: { type: "string", description: "Corpo do email. Pode ser texto simples ou HTML." },
      },
      required: ["to", "subject", "body"],
    },
    quotas: { start: 50, hack: 500, growth: 5000 },
  },
  create_calendar_event: {
    key: "create_calendar_event",
    name: "create_calendar_event",
    description:
      `Cria um evento REAL no Google Calendar do user. Use sempre que disser ao user que vai agendar (reunião, consulta, visita). Quando você chama essa tool, o evento é criado de verdade no calendário.

⚠️ TIMEZONE: Aikortex opera em BRT (Brasília, UTC-3). Quando o user disser "14h" — significa 14h BRT. SEMPRE inclua o offset -03:00 no datetime: "2026-06-04T14:00:00-03:00". Sem o offset, o evento sai 3h fora.

NUNCA diga "agendei" sem chamar essa tool. Se a tool retornar erro (user não conectou Calendar), informe que precisa conectar primeiro.`,
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Título do evento (ex: 'Reunião com Fred — RevendMax')." },
        description: { type: "string", description: "Descrição/notas do evento (opcional, mas recomendado)." },
        start_datetime: {
          type: "string",
          description: "Início em ISO 8601 COM offset de timezone BRT. Exemplo OBRIGATÓRIO: '2026-06-04T14:00:00-03:00' (14h horário de Brasília). NUNCA passe sem o '-03:00' no final.",
        },
        end_datetime: { type: "string", description: "Fim em ISO 8601 com offset -03:00. Se não especificado, default é 1h após o start." },
        attendees: { type: "array", items: { type: "string" }, description: "Lista de emails dos convidados." },
      },
      required: ["summary", "start_datetime"],
    },
    quotas: { start: 50, hack: 500, growth: 5000 },
  },
  table_write: {
    key: "table_write",
    name: "table_write",
    description:
      `Insert, update or delete rows in a client table.

CRITICAL JSON FORMAT for insert/update:
- table_name: string
- action: "insert" | "update" | "delete"
- data: OBJECT with column key-value pairs (do NOT spread fields at the top level)
- filter: OBJECT for update/delete (identifies which rows)

Example INSERT:
{
  "table_name": "Pacientes",
  "action": "insert",
  "data": { "nome": "Maria", "telefone": "11999999999", "email": "maria@x.com" }
}

Example UPDATE:
{
  "table_name": "Pacientes",
  "action": "update",
  "filter": { "nome": "Maria" },
  "data": { "telefone": "11888888888" }
}

Example DELETE:
{
  "table_name": "Pacientes",
  "action": "delete",
  "filter": { "nome": "Maria" }
}`,
    parameters: {
      type: "object",
      properties: {
        table_name: { type: "string", description: "Exact name of the table" },
        action: { type: "string", enum: ["insert", "update", "delete"], description: "Operation type" },
        data: { type: "object", description: "OBJECT with column key-values. For insert: full row. For update: fields to modify. NEVER spread column fields at the top level — always wrap in `data`.", additionalProperties: true },
        filter: { type: "object", description: "OBJECT key-value to identify rows. Required for update/delete.", additionalProperties: true },
      },
      required: ["table_name", "action"],
    },
    quotas: { start: -1, hack: -1, growth: -1 },
  },
};

export interface EnabledTool {
  tool_key: ToolKey;
  config: Record<string, unknown>;
}

/** Loads tools the agent has enabled. Returns [] when there are none.
 *
 * send_email e create_calendar_event são SEMPRE auto-incluídas — ações reais
 * que todo agente que conversa com cliente pode precisar. O executor decide
 * se há infra (Resend, Composio) na hora da execução; LLM apenas tenta chamar
 * e recebe erro honesto se não houver conexão. */
export async function loadEnabledTools(supabase: any, agentId: string): Promise<EnabledTool[]> {
  if (!agentId) return [];
  const { data } = await supabase
    .from("agent_tools")
    .select("tool_key, config, enabled")
    .eq("agent_id", agentId)
    .eq("enabled", true);
  const explicit: EnabledTool[] = (data || [])
    .filter((r: any) => r.tool_key in TOOL_CATALOG)
    .map((r: any) => ({ tool_key: r.tool_key as ToolKey, config: r.config || {} }));
  // Auto-append ações reais (não dependem de DB). LLM pode chamar — runtime
  // dispatcha pra Resend/Composio. Erros voltam pro LLM comunicar ao user.
  const existingKeys = new Set(explicit.map((t) => t.tool_key));
  const autoTools: EnabledTool[] = [];
  if (!existingKeys.has("send_email")) autoTools.push({ tool_key: "send_email", config: {} });
  if (!existingKeys.has("create_calendar_event")) autoTools.push({ tool_key: "create_calendar_event", config: {} });
  return [...explicit, ...autoTools];
}

/** Builds OpenAI/OpenRouter-compatible tool definitions for the LLM. */
export function buildToolDefinitions(enabled: EnabledTool[]) {
  return enabled.map((t) => {
    const def = TOOL_CATALOG[t.tool_key];
    return {
      type: "function",
      function: { name: def.name, description: def.description, parameters: def.parameters },
    };
  });
}

interface ExecuteOptions {
  supabase: any;
  agencyId: string | null;
  agentId: string | null;
  tier: "start" | "hack" | "growth";
  yearMonth: string;
  supabaseUrl: string;
  serviceKey: string;
  anonKey: string;
  userJwt: string | null;
}

/** Executes a single tool call by invoking the appropriate edge function. */
async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  opts: ExecuteOptions,
): Promise<{ ok: boolean; result: string }> {
  const finish = (ok: boolean, result: string, error: string | null = null) => {
    if (!ok) console.warn(`[agent-tools] toolCall ${name} failed: ${error ?? "unknown"}`);
    return { ok, result };
  };

  const fn =
    name === "web_search" ? "tool-web-search" :
    name === "image_gen" ? "tool-image-gen" :
    name === "knowledge_search" ? "tool-knowledge-search" :
    name === "table_read" ? "tool-table-read" :
    name === "table_write" ? "tool-table-write" :
    name === "send_email" ? "tool-send-email" :
    name === "create_calendar_event" ? "composio-execute" :
    null;
  if (!fn) {
    console.warn(`[agent-tools] UNKNOWN_TOOL name=${name}`);
    return finish(false, JSON.stringify({ error: "Tool desconhecida", code: "UNKNOWN_TOOL" }), "UNKNOWN_TOOL");
  }

  const def = TOOL_CATALOG[name as ToolKey];
  const limit = def?.quotas?.[opts.tier] ?? 0;

  try {
    if (opts.agencyId && limit > 0) {
      const { data: newCount, error: incErr } = await opts.supabase.rpc("increment_agency_tool_usage", {
        p_agency_id: opts.agencyId,
        p_year_month: opts.yearMonth,
        p_tool_key: name,
      });
      if (incErr) {
        console.error("quota increment failed", incErr);
      } else if (typeof newCount === "number" && newCount > limit) {
        return finish(
          false,
          JSON.stringify({
            error: `Quota mensal da tool "${name}" excedida no tier ${opts.tier} (${limit}/mês).`,
            code: "QUOTA_EXCEEDED",
            tool: name,
            tier: opts.tier,
            limit,
            used: newCount,
          }),
          "QUOTA_EXCEEDED",
        );
      }
    }

    // Tools that need agent_id injected — LLM doesn't know it.
    const needsAgentId = name === "knowledge_search" || name === "table_read" || name === "table_write";
    let body: Record<string, unknown> = needsAgentId
      ? { ...args, agent_id: opts.agentId }
      : args;

    // create_calendar_event → composio-execute precisa de toolSlug + arguments.
    // Mapeia o nome amigável → slug Composio + monta arguments com keys que o
    // Composio aceita (eventos do Calendar).
    if (name === "create_calendar_event") {
      const summary = String(args.summary ?? "");
      const description = String(args.description ?? "");
      const attendees = Array.isArray(args.attendees) ? args.attendees as string[] : [];

      // Garante timezone -03:00 (BRT) se o LLM esqueceu — sem isso Composio
      // interpreta como UTC e o evento aparece 3h fora no Google Calendar.
      const ensureBRT = (iso: string): string => {
        if (!iso) return iso;
        // Se já tem timezone (Z ou +/-HH:MM), mantém
        if (/[Zz]$|[+-]\d{2}:?\d{2}$/.test(iso)) return iso;
        // Adiciona -03:00 (BRT) — Aikortex é Brasil
        return `${iso}-03:00`;
      };
      const startISO = ensureBRT(String(args.start_datetime ?? ""));
      const endISO = ensureBRT(String(args.end_datetime ?? ""));

      body = {
        toolSlug: "GOOGLECALENDAR_CREATE_EVENT",
        arguments: {
          summary,
          description,
          start_datetime: startISO,
          end_datetime: endISO || undefined,
          attendees: attendees.length > 0 ? attendees : undefined,
          // Composio Google Calendar aceita timezone explícito em alguns specs
          timezone: "America/Sao_Paulo",
        },
      };
    }
    if (name === "send_email") {
      // tool-send-email já aceita {to, subject, body} direto
      body = {
        to: String(args.to ?? ""),
        subject: String(args.subject ?? ""),
        body: String(args.body ?? ""),
        agent_id: opts.agentId,
      };
    }


    const url = `${opts.supabaseUrl}/functions/v1/${fn}`;
    // Prefer the user's JWT when available (chat flow). Webhooks fall back to
    // the service-role key, which the target tool must explicitly accept.
    const authToken = opts.userJwt ?? opts.serviceKey;
    const apiKeyHeader = opts.anonKey || opts.serviceKey;

    console.log(`[agent-tools] → ${fn} body=${JSON.stringify(body).slice(0, 300)}`);
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        apikey: apiKeyHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    console.log(`[agent-tools] ← ${fn} HTTP ${resp.status} body=${text.slice(0, 400)}`);
    if (!resp.ok) {
      console.warn(`[agent-tools] ${fn} FAIL HTTP ${resp.status}: ${text.slice(0, 400)}`);
    }
    return finish(resp.ok, text, resp.ok ? null : `HTTP_${resp.status}`);
  } catch (e) {
    const message = (e as Error).message;
    console.warn(`[agent-tools] ${fn} EXCEPTION ${message}`);
    return finish(false, JSON.stringify({ error: message, code: "TOOL_EXEC_ERROR" }), "TOOL_EXEC_ERROR");
  }
}

export interface RunWithToolsOptions {
  /** Chave OpenRouter — quando vem do runAgentLLM, ja foi resolvida via
   *  cascade (user_api_keys do dono do agente > env). callLLM usa essa em
   *  vez de OPENROUTER_API_KEY. */
  apiKey?: string;
  /** Optional explicit model list; helper falls back to available_llms when omitted. */
  models?: string[];
  messages: Array<{ role: string; content: string | null; tool_calls?: any; tool_call_id?: string; name?: string }>;
  enabled: EnabledTool[];
  supabase: any;
  agencyId: string | null;
  /** Required for knowledge_search and any tool that scopes data per-agent. */
  agentId?: string | null;
  tier?: "start" | "hack" | "growth";
  maxTokens?: number;
  /** Hard cap on tool-loop iterations to avoid runaway calls. */
  maxIterations?: number;
  /** End-user JWT, propagated to tools that require user-scoped auth (e.g. knowledge_search). */
  userJwt?: string | null;
}

/**
 * Calls OpenRouter with function-calling enabled. If the model returns tool_calls,
 * executes them, appends results, and recurses up to `maxIterations` times.
 * Falls back to model rotation if a model errors. Returns the final assistant content.
 */
export async function runWithTools(opts: RunWithToolsOptions): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const yearMonth = new Date().toISOString().slice(0, 7);
  const maxIterations = opts.maxIterations ?? 3;
  const maxTokens = opts.maxTokens ?? 2048;
  // Alinhado ao Master v7.4 §3.2: tiers válidos = start / hack / growth
  let tier: "start" | "hack" | "growth" = opts.tier ?? "start";
  if (!opts.tier && opts.agencyId) {
    try {
      const { data } = await opts.supabase
        .from("agency_profiles")
        .select("tier")
        .eq("id", opts.agencyId)
        .maybeSingle();
      if (data?.tier === "start" || data?.tier === "hack" || data?.tier === "growth") {
        tier = data.tier;
      }
    } catch { /* keep default */ }
  }

  const messages = [...opts.messages];
  const toolDefs = buildToolDefinitions(opts.enabled);
  const hasTools = toolDefs.length > 0;

  for (let iter = 0; iter < maxIterations + 1; iter++) {
    const result = await callLLM(
      messages,
      {
        // Quando runAgentLLM resolveu uma chave do dono do agente (Provedores),
        // ela vem como opts.apiKey e tem prioridade sobre o env (Aikortex).
        apiKey: opts.apiKey,
        preferredModel: opts.models?.[0],
        fallbackModels: opts.models, // honor caller-supplied list when given
        tier: "free",
        toolsRequired: hasTools && iter < maxIterations,
        tools: hasTools && iter < maxIterations ? toolDefs : undefined,
        toolChoice: hasTools && iter < maxIterations ? "auto" : undefined,
        maxTokens,
        timeoutMs: 20000,
      },
      opts.supabase,
    );

    if (!result.success) {
      console.warn(`[runWithTools] iter=${iter} failed: ${result.error}`);
      return "";
    }

    const toolCalls = result.toolCalls as any[] | undefined;
    if (!toolCalls || toolCalls.length === 0) {
      return result.content || "";
    }

    // Append the assistant turn with tool_calls, then run each tool.
    messages.push({
      role: "assistant",
      content: result.content ?? null,
      tool_calls: toolCalls,
    } as any);

    for (const tc of toolCalls) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc.function?.arguments || "{}"); } catch { /* ignore */ }
      const { result: toolResult } = await executeToolCall(tc.function?.name || "", args, {
        supabase: opts.supabase,
        agencyId: opts.agencyId,
        agentId: opts.agentId ?? null,
        tier,
        yearMonth,
        supabaseUrl,
        serviceKey,
        anonKey,
        userJwt: opts.userJwt ?? null,
      });
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        name: tc.function?.name,
        content: toolResult,
      } as any);
    }
  }

  return "⚠️ Limite de iterações de tools atingido.";
}

/**
 * Drop-in replacement for inline `callOpenRouterDirect` helpers — loads enabled
 * tools for the agent (when agentId is provided) and runs the LLM with function
 * calling. Falls back to plain completion when no tools are enabled.
 */
import { resolveAgentLlm } from "./agent-llm-cascade.ts";
import { callProviderLlm, type LlmProvider } from "./agent-llm-dispatchers.ts";

export async function runAgentLLM(opts: {
  supabase: any;
  agentId?: string | null;
  agencyId?: string | null;
  system: string;
  messages: Array<{ role: string; content: string }>;
  models?: string[]; // optional — when omitted, helper loads from available_llms
  maxTokens?: number;
  /** End-user JWT — propagated to user-scoped tools (knowledge_search). */
  userJwt?: string | null;
}): Promise<string | null> {
  const enabled = opts.agentId ? await loadEnabledTools(opts.supabase, opts.agentId) : [];
  const systemWithHints = applyToolsHints(opts.system, enabled);
  const fullMessages = [{ role: "system", content: systemWithHints }, ...opts.messages];

  // ── Cascade: resolve qual provider+chave usar (user > platform) ──
  // Master v7.4: agencia configurou propria chave -> Aikortex desligada.
  const platformOrKey = Deno.env.get("OPENROUTER_API_KEY") ?? null;
  // Pega o modelo configurado no proprio agente — define provider esperado.
  let agentModel: string | null = null;
  if (opts.agentId) {
    try {
      const { data } = await opts.supabase
        .from("user_agents")
        .select("config")
        .eq("id", opts.agentId)
        .maybeSingle();
      agentModel = ((data as any)?.config?.model ?? null) || (opts.models?.[0] ?? null);
    } catch { /* ignore */ }
  }
  const resolution = opts.agentId
    ? await resolveAgentLlm(opts.supabase, opts.agentId, agentModel, platformOrKey)
    : (platformOrKey ? { provider: "openrouter" as LlmProvider, apiKey: platformOrKey, source: "platform" as const } : null);

  if (!resolution) {
    console.error(`[runAgentLLM] sem chave LLM disponivel pra agentId=${opts.agentId}`);
    return null;
  }
  if (resolution.mismatchError) {
    console.error(`[runAgentLLM] mismatch: ${resolution.mismatchError}`);
    return resolution.mismatchError;
  }
  console.log(`[runAgentLLM] agentId=${opts.agentId} provider=${resolution.provider} source=${resolution.source}`);

  // ── OpenRouter: path original (callLLM via llm-fallback) ──
  // Mantem retry + telemetry + health tracking que ja existem.
  if (resolution.provider === "openrouter") {
    const text = await runWithTools({
      apiKey: resolution.apiKey,
      models: opts.models ?? [],
      messages: fullMessages,
      enabled,
      supabase: opts.supabase,
      agencyId: opts.agencyId ?? null,
      agentId: opts.agentId ?? null,
      maxTokens: opts.maxTokens,
      userJwt: opts.userJwt ?? null,
    });
    return text || null;
  }

  // ── OpenAI / Anthropic / Gemini direto: usa dispatcher ──
  const text = await runWithToolsDirect({
    provider: resolution.provider,
    apiKey: resolution.apiKey,
    model: agentModel || "",
    messages: fullMessages,
    enabled,
    supabase: opts.supabase,
    agencyId: opts.agencyId ?? null,
    agentId: opts.agentId ?? null,
    maxTokens: opts.maxTokens,
    userJwt: opts.userJwt ?? null,
  });
  return text || null;
}

/** Loop de tool-calling pros providers diretos (nao-OpenRouter).
 *  Espelha o flow do runWithTools mas usa callProviderLlm em vez do callLLM
 *  (que e' OpenRouter-only). */
async function runWithToolsDirect(opts: {
  provider: LlmProvider;
  apiKey: string;
  model: string;
  messages: Array<{ role: string; content: any; tool_calls?: any; tool_call_id?: string; name?: string }>;
  enabled: EnabledTool[];
  supabase: any;
  agencyId: string | null;
  agentId?: string | null;
  maxTokens?: number;
  userJwt?: string | null;
  maxIterations?: number;
}): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const yearMonth = new Date().toISOString().slice(0, 7);
  const maxIterations = opts.maxIterations ?? 3;
  const maxTokens = opts.maxTokens ?? 2048;
  let tier: "start" | "hack" | "growth" = "start";
  if (opts.agencyId) {
    try {
      const { data } = await opts.supabase
        .from("agency_profiles")
        .select("tier")
        .eq("id", opts.agencyId)
        .maybeSingle();
      if (data?.tier === "start" || data?.tier === "hack" || data?.tier === "growth") {
        tier = data.tier;
      }
    } catch { /* keep default */ }
  }

  const messages = [...opts.messages];
  const toolDefs = buildToolDefinitions(opts.enabled).map((t: any) => ({
    name: t.function?.name,
    description: t.function?.description,
    input_schema: t.function?.parameters,
  }));

  for (let iter = 0; iter < maxIterations + 1; iter++) {
    let result;
    try {
      result = await callProviderLlm(
        opts.provider,
        opts.apiKey,
        opts.model,
        messages,
        iter < maxIterations ? toolDefs : [], // ultima iter, sem tools — forca texto final
        { maxTokens },
      );
    } catch (e) {
      console.warn(`[runWithToolsDirect] iter=${iter} ${opts.provider} falhou:`, (e as Error).message);
      return "";
    }

    const toolCalls = result.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      return result.content || "";
    }

    // Anexa turn do assistant com tool_calls
    messages.push({
      role: "assistant",
      content: result.content ?? null,
      tool_calls: toolCalls,
    });

    for (const tc of toolCalls) {
      const { result: toolResult } = await executeToolCall(tc.name || "", tc.arguments || {}, {
        supabase: opts.supabase,
        agencyId: opts.agencyId,
        agentId: opts.agentId ?? null,
        tier,
        yearMonth,
        supabaseUrl,
        serviceKey,
        anonKey,
        userJwt: opts.userJwt ?? null,
      });
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        name: tc.name,
        content: toolResult,
      });
    }
  }

  return "⚠️ Limite de iterações de tools atingido.";
}

/**
 * @deprecated Use `callLLM` from `../_shared/llm-fallback.ts` instead.
 * Kept as thin wrapper for backward compatibility during migration.
 */
export async function callOpenRouter(
  messages: Array<{ role: string; content: string }>,
  opts: {
    apiKey?: string;
    preferredModel?: string;
    fallbackModels?: string[];
    maxTokens?: number;
    stream?: boolean;
    timeout?: number;
    stop?: string[];
  } = {},
): Promise<Response | null> {
  const result = await callLLM(messages, {
    apiKey: opts.apiKey,
    preferredModel: opts.preferredModel,
    fallbackModels: opts.fallbackModels,
    maxTokens: opts.maxTokens,
    stream: opts.stream,
    timeoutMs: opts.timeout,
    extraBody: opts.stop?.length ? { stop: opts.stop } : undefined,
  });
  if (!result.success) return null;
  if (opts.stream && result.response) return result.response;
  // Reconstruct a synthetic Response for non-stream legacy callers
  return new Response(JSON.stringify(result.raw ?? { choices: [{ message: { content: result.content } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

