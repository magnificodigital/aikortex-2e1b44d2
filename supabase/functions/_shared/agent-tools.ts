// ── Sprint 2.4-a: Agent Tools runtime (Aikortex Master v7.4 §13.15) ──
// Function-calling helper shared by all LLM call sites.

export type ToolKey = "web_search" | "image_gen";

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
  tier: "starter" | "explorer" | "hack";
  yearMonth: string;
  supabaseUrl: string;
  serviceKey: string;
}

/** Executes a single tool call by invoking the appropriate edge function. */
async function executeToolCall(
  name: string,
  args: Record<string, unknown>,
  opts: ExecuteOptions,
): Promise<{ ok: boolean; result: string }> {
  const fn = name === "web_search" ? "tool-web-search" : name === "image_gen" ? "tool-image-gen" : null;
  if (!fn) return { ok: false, result: JSON.stringify({ error: "Tool desconhecida", code: "UNKNOWN_TOOL" }) };

  const def = TOOL_CATALOG[name as ToolKey];
  const limit = def?.quotas?.[opts.tier] ?? 0;

  try {
    // Quota check (blocking) + atomic increment.
    if (opts.agencyId && limit > 0) {
      const { data: newCount, error: incErr } = await opts.supabase.rpc("increment_agency_tool_usage", {
        p_agency_id: opts.agencyId,
        p_year_month: opts.yearMonth,
        p_tool_key: name,
      });
      if (incErr) {
        console.error("quota increment failed", incErr);
      } else if (typeof newCount === "number" && newCount > limit) {
        return {
          ok: false,
          result: JSON.stringify({
            error: `Quota mensal da tool "${name}" excedida no tier ${opts.tier} (${limit}/mês).`,
            code: "QUOTA_EXCEEDED",
            tool: name,
            tier: opts.tier,
            limit,
            used: newCount,
          }),
        };
      }
    }

    const resp = await fetch(`${opts.supabaseUrl}/functions/v1/${fn}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });
    const text = await resp.text();
    return { ok: resp.ok, result: text };
  } catch (e) {
    return { ok: false, result: JSON.stringify({ error: (e as Error).message, code: "TOOL_EXEC_ERROR" }) };
  }
}

export interface RunWithToolsOptions {
  apiKey: string;
  models: string[];
  messages: Array<{ role: string; content: string | null; tool_calls?: any; tool_call_id?: string; name?: string }>;
  enabled: EnabledTool[];
  supabase: any;
  agencyId: string | null;
  tier?: "starter" | "explorer" | "hack";
  maxTokens?: number;
  /** Hard cap on tool-loop iterations to avoid runaway calls. */
  maxIterations?: number;
}

/**
 * Calls OpenRouter with function-calling enabled. If the model returns tool_calls,
 * executes them, appends results, and recurses up to `maxIterations` times.
 * Falls back to model rotation if a model errors. Returns the final assistant content.
 */
export async function runWithTools(opts: RunWithToolsOptions): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
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
    let assistantMessage: any = null;

    for (const model of opts.models) {
      try {
        const body: Record<string, unknown> = {
          model,
          messages,
          stream: false,
          max_tokens: maxTokens,
        };
        if (hasTools && iter < maxIterations) {
          body.tools = toolDefs;
          body.tool_choice = "auto";
        }

        const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          signal: AbortSignal.timeout(20000),
          headers: {
            Authorization: `Bearer ${opts.apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://aikortex26.lovable.app",
            "X-Title": "Aikortex",
          },
          body: JSON.stringify(body),
        });

        if (!resp.ok) continue;
        const data = await resp.json();
        assistantMessage = data?.choices?.[0]?.message;
        if (assistantMessage) break;
      } catch {
        continue;
      }
    }

    if (!assistantMessage) return "";

    const toolCalls = assistantMessage.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      return assistantMessage.content || assistantMessage.reasoning || "";
    }

    // Append the assistant turn with tool_calls, then run each tool.
    messages.push({
      role: "assistant",
      content: assistantMessage.content ?? null,
      tool_calls: toolCalls,
    });

    for (const tc of toolCalls) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc.function?.arguments || "{}"); } catch { /* ignore */ }
      const { result } = await executeToolCall(tc.function?.name || "", args, {
        supabase: opts.supabase,
        agencyId: opts.agencyId,
        yearMonth,
        supabaseUrl,
        serviceKey,
      });
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        name: tc.function?.name,
        content: result,
      });
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
  models: string[];
  maxTokens?: number;
}): Promise<string | null> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";
  if (!apiKey) return null;
  const enabled = opts.agentId ? await loadEnabledTools(opts.supabase, opts.agentId) : [];
  const fullMessages = [{ role: "system", content: opts.system }, ...opts.messages];
  const text = await runWithTools({
    apiKey,
    models: opts.models,
    messages: fullMessages,
    enabled,
    supabase: opts.supabase,
    agencyId: opts.agencyId ?? null,
    maxTokens: opts.maxTokens,
  });
  return text || null;
}
