// ─────────────────────────────────────────────────────────────────────────
// Tradutor multi-provider (BYOK de produção — Master v7.4 / decisão 2026-08-11)
//
// Depois que o agente está montado, a AGÊNCIA usa a PRÓPRIA chave de API e o
// modelo que ela escolher. Cada provider "fala um dialeto": este módulo recebe
// { provider, apiKey, model, messages, tools } e roteia pro endpoint/formato
// certo, devolvendo SEMPRE o mesmo LLMResult do runtime (encaixe drop-in).
//
// OpenAI-compatíveis (mesmo dialeto): openai, deepseek, qwen, kimi, glm.
// Dialeto próprio: anthropic, gemini.
//
// A MONTAGEM do agente continua na chave da plataforma via callLLM (OpenRouter).
// ─────────────────────────────────────────────────────────────────────────
import type { LLMMessage, LLMResult } from "./llm-fallback.ts";

export type AgencyProvider =
  | "openai" | "deepseek" | "qwen" | "kimi" | "glm" | "anthropic" | "gemini";

/** Metadados por provider — usado no dispatch e na checagem de compatibilidade. */
export const PROVIDER_META: Record<AgencyProvider, {
  label: string;
  openaiCompat: boolean;
  /** Suporte a function-calling (tools) já implementado neste tradutor. */
  supportsTools: boolean;
}> = {
  openai:    { label: "OpenAI",    openaiCompat: true,  supportsTools: true },
  deepseek:  { label: "DeepSeek",  openaiCompat: true,  supportsTools: true },
  qwen:      { label: "Qwen",      openaiCompat: true,  supportsTools: true },
  kimi:      { label: "Kimi",      openaiCompat: true,  supportsTools: true },
  glm:       { label: "GLM",       openaiCompat: true,  supportsTools: true },
  // Anthropic e Gemini: texto suportado; tools ainda não (fase seguinte).
  anthropic: { label: "Anthropic", openaiCompat: false, supportsTools: false },
  gemini:    { label: "Gemini",    openaiCompat: false, supportsTools: false },
};

const OPENAI_COMPAT_BASE: Record<string, string> = {
  openai:   "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
  qwen:     "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  kimi:     "https://api.moonshot.ai/v1",
  glm:      "https://open.bigmodel.cn/api/paas/v4",
};

const DEFAULT_TIMEOUT_MS = 30000;

export type AgencyLLMParams = {
  provider: AgencyProvider;
  apiKey: string;
  model: string;
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  tools?: unknown[];
  toolChoice?: unknown;
  timeoutMs?: number;
};

export function isAgencyProvider(p: string | undefined | null): p is AgencyProvider {
  return !!p && p in PROVIDER_META;
}

/** Ponto único de entrada: roteia pro dialeto certo do provider. */
export async function callAgencyLLM(params: AgencyLLMParams): Promise<LLMResult> {
  const { provider, apiKey } = params;
  if (!isAgencyProvider(provider)) {
    return { success: false, error: `Provider desconhecido: ${provider}` };
  }
  if (!apiKey) {
    return { success: false, error: `Sem chave de API conectada para ${PROVIDER_META[provider].label}` };
  }
  try {
    if (PROVIDER_META[provider].openaiCompat) return await callOpenAICompat(params);
    if (provider === "anthropic") return await callAnthropic(params);
    if (provider === "gemini") return await callGemini(params);
    return { success: false, error: `Provider não roteado: ${provider}` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: `Falha ao chamar ${PROVIDER_META[provider].label}: ${msg}` };
  }
}

// ── OpenAI-compatível (openai/deepseek/qwen/kimi/glm) ──────────────────────
async function callOpenAICompat(p: AgencyLLMParams): Promise<LLMResult> {
  const base = OPENAI_COMPAT_BASE[p.provider];
  const body: Record<string, unknown> = {
    model: p.model,
    messages: p.messages,
    max_tokens: p.maxTokens ?? 1024,
    temperature: p.temperature ?? 0.7,
  };
  if (p.tools && (p.tools as unknown[]).length) {
    body.tools = p.tools;
    if (p.toolChoice) body.tool_choice = p.toolChoice;
  }
  const resp = await fetchWithTimeout(`${base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${p.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, p.timeoutMs);
  const json = await safeJson(resp);
  if (!resp.ok) {
    return { success: false, status_code: resp.status, error: extractErr(json) || `${p.provider} erro ${resp.status}` };
  }
  const msg = json?.choices?.[0]?.message ?? {};
  return {
    success: true,
    content: typeof msg.content === "string" ? msg.content : "",
    toolCalls: msg.tool_calls,
    model_used: json?.model || p.model,
    raw: json,
  };
}

// ── Anthropic (dialeto próprio) ────────────────────────────────────────────
async function callAnthropic(p: AgencyLLMParams): Promise<LLMResult> {
  const system = p.messages.filter((m) => m.role === "system").map((m) => asText(m.content)).join("\n\n");
  const msgs = p.messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: asText(m.content) }));
  const body: Record<string, unknown> = {
    model: p.model,
    max_tokens: p.maxTokens ?? 1024,
    messages: msgs,
  };
  if (system) body.system = system;
  if (p.temperature != null) body.temperature = p.temperature;
  const resp = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": p.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  }, p.timeoutMs);
  const json = await safeJson(resp);
  if (!resp.ok) {
    return { success: false, status_code: resp.status, error: extractErr(json) || `Anthropic erro ${resp.status}` };
  }
  const text = Array.isArray(json?.content)
    ? json.content.filter((b: any) => b?.type === "text").map((b: any) => b.text).join("")
    : "";
  return { success: true, content: text, model_used: json?.model || p.model, raw: json };
}

// ── Gemini (dialeto próprio) ───────────────────────────────────────────────
async function callGemini(p: AgencyLLMParams): Promise<LLMResult> {
  const system = p.messages.filter((m) => m.role === "system").map((m) => asText(m.content)).join("\n\n");
  const contents = p.messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: asText(m.content) }] }));
  const body: Record<string, unknown> = { contents };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  body.generationConfig = {
    maxOutputTokens: p.maxTokens ?? 1024,
    ...(p.temperature != null ? { temperature: p.temperature } : {}),
  };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(p.model)}:generateContent?key=${encodeURIComponent(p.apiKey)}`;
  const resp = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, p.timeoutMs);
  const json = await safeJson(resp);
  if (!resp.ok) {
    return { success: false, status_code: resp.status, error: extractErr(json) || `Gemini erro ${resp.status}` };
  }
  const text = json?.candidates?.[0]?.content?.parts?.map((pt: any) => pt?.text ?? "").join("") ?? "";
  return { success: true, content: text, model_used: p.model, raw: json };
}

// ── utils ──────────────────────────────────────────────────────────────────
function asText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((b: any) => (typeof b === "string" ? b : b?.text ?? ""))
      .join("");
  }
  if (content == null) return "";
  return JSON.stringify(content);
}

async function safeJson(resp: Response): Promise<any> {
  try { return await resp.json(); } catch { return null; }
}

function extractErr(json: any): string {
  return json?.error?.message || json?.message || (typeof json?.error === "string" ? json.error : "");
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs?: number): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}
