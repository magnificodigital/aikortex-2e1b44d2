// Shared OpenRouter caller with model fallback + health tracking.
// Single source of truth: reads available_llms from DB.
//
// Usage:
//   const result = await callLLM(messages, { tier: "free", maxTokens: 1024 }, supabase);
//   if (!result.success) throw new Error(result.error);
//   console.log(result.content, result.model_used, result.latency_ms);
//
// Streaming:
//   const result = await callLLM(messages, { stream: true }, supabase);
//   if (result.success) return new Response(result.response!.body, { headers: ... });
//
// Tools:
//   const result = await callLLM(messages, { tools, toolChoice: "auto", toolsRequired: true }, supabase);

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type SupabaseClient = ReturnType<typeof createClient>;

// ── Constants ──────────────────────────────────────────────────────────────
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_HEADERS = {
  "HTTP-Referer": "https://aikortex26.lovable.app",
  "X-Title": "Aikortex",
} as const;
const DEFAULT_TIMEOUT_MS = 15000;
const RETRYABLE_STATUS = new Set([400, 402, 404, 410, 429, 500, 502, 503, 504]);

// ── Types ──────────────────────────────────────────────────────────────────
export type LLMMessage = { role: string; content: string | unknown; [k: string]: unknown };

export type LLMOptions = {
  preferredModel?: string;
  fallbackModels?: string[]; // explicit override; bypasses DB
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  tier?: "free" | "paid";
  toolsRequired?: boolean;
  tools?: unknown[];
  toolChoice?: unknown;
  responseFormat?: unknown;
  timeoutMs?: number;
  extraBody?: Record<string, unknown>;
};

export type LLMResult = {
  success: boolean;
  content?: string;
  toolCalls?: unknown[];
  model_used?: string;
  latency_ms?: number;
  attempts?: number;
  error?: string;
  status_code?: number;
  response?: Response; // present only when stream=true and success
  raw?: unknown; // full json (non-stream)
};

// ── Public: load active models from DB ─────────────────────────────────────
export async function loadActiveModels(
  supabase: SupabaseClient | undefined,
  options: { tier?: "free" | "paid"; toolsRequired?: boolean } = {},
): Promise<string[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("available_llms")
    .select("model_id, supports_tools, status, priority")
    .eq("active", true)
    .eq("tier", options.tier ?? "free")
    .neq("status", "dead")
    .order("priority", { ascending: true });
  if (error) {
    console.error("[llm-fallback] loadActiveModels error:", error.message);
    return [];
  }
  let rows = data ?? [];
  if (options.toolsRequired) rows = rows.filter((m: any) => m.supports_tools === true);
  return rows.map((m: any) => m.model_id);
}

// ── Health tracking ────────────────────────────────────────────────────────
async function markHealthy(supabase: SupabaseClient | undefined, model_id: string) {
  if (!supabase) return;
  try {
    await supabase
      .from("available_llms")
      .update({
        status: "healthy",
        consecutive_failures: 0,
        last_health_check_at: new Date().toISOString(),
        last_health_check_error: null,
      })
      .eq("model_id", model_id);
  } catch (e) {
    console.warn("[llm-fallback] markHealthy failed:", (e as Error).message);
  }
}

async function markFailure(
  supabase: SupabaseClient | undefined,
  model_id: string,
  status: number,
  error: string,
) {
  if (!supabase) return;
  try {
    const { data } = await supabase
      .from("available_llms")
      .select("consecutive_failures")
      .eq("model_id", model_id)
      .maybeSingle();
    const failures = ((data as any)?.consecutive_failures ?? 0) + 1;
    // 429 doesn't count as a hard failure (provider-side rate limit, not model death)
    const isRateLimit = status === 429;
    const newStatus = isRateLimit
      ? "degraded"
      : failures >= 5
      ? "dead"
      : failures >= 2
      ? "degraded"
      : "healthy";
    await supabase
      .from("available_llms")
      .update({
        status: newStatus,
        consecutive_failures: isRateLimit ? failures : failures,
        last_health_check_at: new Date().toISOString(),
        last_health_check_error: `HTTP ${status}: ${error.slice(0, 200)}`,
      })
      .eq("model_id", model_id);
  } catch (e) {
    console.warn("[llm-fallback] markFailure failed:", (e as Error).message);
  }
}

// ── Main entry ─────────────────────────────────────────────────────────────
export async function callLLM(
  messages: LLMMessage[],
  options: LLMOptions = {},
  supabase?: SupabaseClient,
): Promise<LLMResult> {
  // TODO: temporary debug — remove after diagnosis.
  console.log(`[llm-fallback] callLLM start tier=${options.tier ?? "free"} preferredModel=${options.preferredModel ?? "none"} stream=${options.stream ?? false} toolsRequired=${options.toolsRequired ?? false}`);
  const apiKey = options.apiKey || Deno.env.get("OPENROUTER_API_KEY") || "";
  if (!apiKey) {
    console.error("[llm-fallback] OPENROUTER_API_KEY ausente");
    return { success: false, error: "OPENROUTER_API_KEY ausente" };
  }

  // Resolve model list
  let models: string[];
  if (options.fallbackModels && options.fallbackModels.length > 0) {
    models = [...options.fallbackModels];
  } else {
    models = await loadActiveModels(supabase, {
      tier: options.tier ?? "free",
      toolsRequired: options.toolsRequired,
    });
  }
  if (options.preferredModel) {
    models = [options.preferredModel, ...models.filter((m) => m !== options.preferredModel)];
  }
  // TODO: temporary debug — remove after diagnosis.
  console.log(`[llm-fallback] models loaded count=${models.length} list=${models.slice(0, 5).join(",")}`);
  if (models.length === 0) {
    return {
      success: false,
      error: `Nenhum modelo ativo disponível (tier=${options.tier ?? "free"}${
        options.toolsRequired ? ", tools" : ""
      })`,
    };
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const isStream = options.stream ?? false;

  let attempts = 0;
  let lastError = "Todos os modelos falharam";
  let lastStatus = 0;

  for (const model of models) {
    attempts++;
    const t0 = Date.now();
    // TODO: temporary debug — remove after diagnosis.
    console.log(`[llm-fallback] trying ${model} (attempt ${attempts}/${models.length})`);
    const body: Record<string, unknown> = {
      model,
      messages,
      stream: isStream,
      max_tokens: options.maxTokens ?? 2048,
    };
    if (options.temperature !== undefined) body.temperature = options.temperature;
    if (options.tools) body.tools = options.tools;
    if (options.toolChoice !== undefined) body.tool_choice = options.toolChoice;
    if (options.responseFormat) body.response_format = options.responseFormat;
    if (options.extraBody) Object.assign(body, options.extraBody);

    try {
      const resp = await fetch(OPENROUTER_URL, {
        method: "POST",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...DEFAULT_HEADERS,
        },
        body: JSON.stringify(body),
      });
      const latency = Date.now() - t0;

      // Streaming: must succeed on first byte
      if (isStream) {
        if (resp.ok) {
          console.log(`[llm-fallback] ${model} stream ok latency=${latency}ms`);
          markHealthy(supabase, model);
          return {
            success: true,
            model_used: model,
            latency_ms: latency,
            attempts,
            response: resp,
          };
        }
        const errText = await resp.text().catch(() => "");
        console.warn(`[llm-fallback] ${model} stream FAIL status=${resp.status} ${errText.slice(0, 200)}`);
        markFailure(supabase, model, resp.status, errText);
        lastError = errText.slice(0, 300);
        lastStatus = resp.status;
        if (RETRYABLE_STATUS.has(resp.status)) continue;
        continue; // keep trying anyway — better to fall through than crash
      }

      // Non-stream
      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        console.warn(`[llm-fallback] ${model} FAIL status=${resp.status} latency=${latency}ms ${errText.slice(0, 200)}`);
        markFailure(supabase, model, resp.status, errText);
        lastError = errText.slice(0, 300);
        lastStatus = resp.status;
        if (RETRYABLE_STATUS.has(resp.status)) continue;
        continue;
      }

      const data = await resp.json();
      const msg = data?.choices?.[0]?.message;
      const content: string = msg?.content || msg?.reasoning || "";
      const toolCalls = msg?.tool_calls;

      // If tools were requested and model returned tool calls, that counts as success even with empty content
      const hasToolCalls = Array.isArray(toolCalls) && toolCalls.length > 0;
      if (!content && !hasToolCalls) {
        console.warn(`[llm-fallback] ${model} EMPTY latency=${latency}ms`);
        markFailure(supabase, model, 200, "empty content");
        lastError = "empty content";
        continue;
      }

      // TODO: temporary debug — remove after diagnosis.
      console.log(`[llm-fallback] ${model} → status=${resp.status} latency=${latency}ms contentLen=${content?.length ?? 0} toolCalls=${hasToolCalls ? toolCalls.length : 0}`);
      markHealthy(supabase, model);
      return {
        success: true,
        content,
        toolCalls: hasToolCalls ? toolCalls : undefined,
        model_used: model,
        latency_ms: latency,
        attempts,
        raw: data,
      };
    } catch (e) {
      const errMsg = (e as Error).message;
      const latency = Date.now() - t0;
      console.warn(`[llm-fallback] ${model} EXCEPTION latency=${latency}ms ${errMsg}`);
      markFailure(supabase, model, 0, errMsg);
      lastError = errMsg;
      continue;
    }
  }

  // TODO: temporary debug — remove after diagnosis.
  console.error(`[llm-fallback] ALL MODELS FAILED. tried=${attempts}/${models.length} lastStatus=${lastStatus} lastError=${lastError}`);
  return {
    success: false,
    error: lastError,
    status_code: lastStatus,
    attempts,
  };
}

// ── Convenience: Supabase admin client builder ─────────────────────────────
export function buildAdminClient(): SupabaseClient | undefined {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return undefined;
  return createClient(url, key);
}
