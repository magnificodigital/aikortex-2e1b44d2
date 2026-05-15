// ── Sprint 2.4-a: Agent Tools runtime (Aikortex Master v7.4 §13.15) ──
// Function-calling helper shared by all LLM call sites.

import { callLLM } from "./llm-fallback.ts";
import { applyToolsHints } from "./agent-runtime.ts";

export type ToolKey = "web_search" | "image_gen" | "knowledge_search" | "table_read" | "table_write";

export interface ToolQuota {
  starter: number;
  explorer: number;
  hack: number;
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
    quotas: { starter: 50, explorer: 200, hack: 1000 },
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
    quotas: { starter: 50, explorer: 100, hack: 500 },
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
    quotas: { starter: -1, explorer: -1, hack: -1 },
  },
  table_read: {
    key: "table_read",
    name: "table_read",
    description:
      "Search rows in a client table. Use this when the user asks about specific records: people, prices, schedules, products, status of items. Always specify the table_name. Optionally provide a filter (key-value pairs) to narrow down results.",
    parameters: {
      type: "object",
      properties: {
        table_name: { type: "string", description: "Exact name of the table to search (case-sensitive, e.g. 'Pacientes')" },
        filter: { type: "object", description: "Optional filter as key-value pairs. Example: {\"nome\": \"Maria\"}. Keys must match column keys.", additionalProperties: true },
        limit: { type: "number", description: "Max rows to return. Default 10, max 50.", default: 10 },
      },
      required: ["table_name"],
    },
    quotas: { starter: -1, explorer: -1, hack: -1 },
  },
  table_write: {
    key: "table_write",
    name: "table_write",
    description:
      "Insert, update or delete rows in a client table. Use when the user asks to register a new entry, update existing data, or remove an entry. Always specify table_name and action. For update/delete, always include a filter.",
    parameters: {
      type: "object",
      properties: {
        table_name: { type: "string", description: "Exact name of the table" },
        action: { type: "string", enum: ["insert", "update", "delete"], description: "Operation: insert (new row), update (modify existing), delete (remove)" },
        data: { type: "object", description: "For insert: complete row data. For update: fields to modify. Keys match column keys.", additionalProperties: true },
        filter: { type: "object", description: "Required for update/delete: identifies which rows to affect.", additionalProperties: true },
      },
      required: ["table_name", "action"],
    },
    quotas: { starter: -1, explorer: -1, hack: -1 },
  },
};

export interface EnabledTool {
  tool_key: ToolKey;
  config: Record<string, unknown>;
}

/** Loads tools the agent has enabled. Returns [] when there are none. */
export async function loadEnabledTools(supabase: any, agentId: string): Promise<EnabledTool[]> {
  if (!agentId) return [];
  const { data } = await supabase
    .from("agent_tools")
    .select("tool_key, config, enabled")
    .eq("agent_id", agentId)
    .eq("enabled", true);
  return (data || [])
    .filter((r: any) => r.tool_key in TOOL_CATALOG)
    .map((r: any) => ({ tool_key: r.tool_key, config: r.config || {} }));
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
  tier: "starter" | "explorer" | "hack";
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

    // knowledge_search needs the agent_id injected — LLM doesn't know it.
    const body = name === "knowledge_search"
      ? { ...args, agent_id: opts.agentId }
      : args;

    const url = `${opts.supabaseUrl}/functions/v1/${fn}`;
    // Prefer the user's JWT when available (chat flow). Webhooks fall back to
    // the service-role key, which the target tool must explicitly accept.
    const authToken = opts.userJwt ?? opts.serviceKey;
    const apiKeyHeader = opts.anonKey || opts.serviceKey;

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
    if (!resp.ok) {
      console.warn(`[agent-tools] ${fn} HTTP ${resp.status}: ${text.slice(0, 200)}`);
    }
    return finish(resp.ok, text, resp.ok ? null : `HTTP_${resp.status}`);
  } catch (e) {
    const message = (e as Error).message;
    console.warn(`[agent-tools] ${fn} EXCEPTION ${message}`);
    return finish(false, JSON.stringify({ error: message, code: "TOOL_EXEC_ERROR" }), "TOOL_EXEC_ERROR");
  }
}

export interface RunWithToolsOptions {
  /** @deprecated apiKey is now read from env by the shared helper. */
  apiKey?: string;
  /** Optional explicit model list; helper falls back to available_llms when omitted. */
  models?: string[];
  messages: Array<{ role: string; content: string | null; tool_calls?: any; tool_call_id?: string; name?: string }>;
  enabled: EnabledTool[];
  supabase: any;
  agencyId: string | null;
  /** Required for knowledge_search and any tool that scopes data per-agent. */
  agentId?: string | null;
  tier?: "starter" | "explorer" | "hack";
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
  let tier: "starter" | "explorer" | "hack" = opts.tier ?? "starter";
  if (!opts.tier && opts.agencyId) {
    try {
      const { data } = await opts.supabase
        .from("agency_profiles")
        .select("tier")
        .eq("id", opts.agencyId)
        .maybeSingle();
      if (data?.tier === "starter" || data?.tier === "explorer" || data?.tier === "hack") {
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
  const apiKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";
  if (!apiKey) return null;
  const enabled = opts.agentId ? await loadEnabledTools(opts.supabase, opts.agentId) : [];
  const systemWithHints = applyToolsHints(opts.system, enabled);
  const fullMessages = [{ role: "system", content: systemWithHints }, ...opts.messages];
  const text = await runWithTools({
    apiKey,
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

