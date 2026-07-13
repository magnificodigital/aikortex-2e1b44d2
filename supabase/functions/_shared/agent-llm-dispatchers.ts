// Dispatchers diretos pros 4 providers LLM (OpenRouter, OpenAI, Anthropic, Gemini).
//
// Usado pelo agent runtime quando a agencia configurou chave propria pra um
// provider que nao seja OpenRouter (que ja e' coberto pelo callLLM padrao).
//
// Tools no formato OpenAI sao usadas como input — convertidos por dispatcher
// pra o formato nativo do provider (Anthropic input_schema, Gemini
// functionDeclarations).

export type LlmProvider = "openrouter" | "openai" | "anthropic" | "gemini";

export interface ToolDef {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

export interface LlmResponse {
  content: string;
  tool_calls?: Array<{ id: string; name: string; arguments: any }>;
  prompt_tokens: number;
  completion_tokens: number;
}

export async function callProviderLlm(
  provider: LlmProvider,
  apiKey: string,
  model: string,
  messages: any[],
  tools: ToolDef[],
  options?: { maxTokens?: number },
): Promise<LlmResponse> {
  const maxTokens = options?.maxTokens ?? 2048;
  switch (provider) {
    case "anthropic": return callAnthropic(apiKey, model, messages, tools, maxTokens);
    case "openrouter": return callOpenRouter(apiKey, model, messages, tools, maxTokens);
    case "openai": return callOpenAI(apiKey, model, messages, tools, maxTokens);
    case "gemini": return callGemini(apiKey, model, messages, tools, maxTokens);
  }
}

async function callAnthropic(apiKey: string, model: string, messages: any[], tools: ToolDef[], maxTokens: number): Promise<LlmResponse> {
  const systemMsg = messages.find((m) => m.role === "system");
  const nonSystem = messages.filter((m) => m.role !== "system").map((m) => {
    if (m.role === "tool") {
      return { role: "user", content: [{ type: "tool_result", tool_use_id: m.tool_call_id, content: m.content }] };
    }
    return m;
  });

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      system: systemMsg?.content || "",
      messages: nonSystem,
      max_tokens: maxTokens,
      tools: tools.length ? tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema })) : undefined,
    }),
  });
  if (!resp.ok) throw new Error(`Anthropic ${resp.status}: ${await resp.text()}`);
  const j = await resp.json();
  let content = "";
  const toolCalls: any[] = [];
  for (const block of j.content || []) {
    if (block.type === "text") content += block.text;
    if (block.type === "tool_use") toolCalls.push({ id: block.id, name: block.name, arguments: block.input });
  }
  return {
    content,
    tool_calls: toolCalls.length ? toolCalls : undefined,
    prompt_tokens: j.usage?.input_tokens || 0,
    completion_tokens: j.usage?.output_tokens || 0,
  };
}

async function callOpenRouter(apiKey: string, model: string, messages: any[], tools: ToolDef[], maxTokens: number): Promise<LlmResponse> {
  return callOpenAICompatible("https://openrouter.ai/api/v1/chat/completions", apiKey, model, messages, tools, maxTokens, {
    "HTTP-Referer": "https://agents.aikortex.com",
    "X-Title": "Aikortex Agent",
  });
}

async function callOpenAI(apiKey: string, model: string, messages: any[], tools: ToolDef[], maxTokens: number): Promise<LlmResponse> {
  return callOpenAICompatible("https://api.openai.com/v1/chat/completions", apiKey, model, messages, tools, maxTokens);
}

async function callOpenAICompatible(
  url: string, apiKey: string, model: string, messages: any[], tools: ToolDef[], maxTokens: number, extraHeaders: Record<string, string> = {},
): Promise<LlmResponse> {
  const resp = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => {
        if (m.role === "tool") return { role: "tool", tool_call_id: m.tool_call_id, content: m.content };
        return m;
      }),
      tools: tools.length ? tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.input_schema },
      })) : undefined,
      max_tokens: maxTokens,
    }),
  });
  if (!resp.ok) throw new Error(`LLM ${resp.status}: ${await resp.text()}`);
  const j = await resp.json();
  const msg = j.choices?.[0]?.message;
  const toolCalls = (msg?.tool_calls || []).map((tc: any) => ({
    id: tc.id,
    name: tc.function?.name,
    arguments: tc.function?.arguments ? JSON.parse(tc.function.arguments) : {},
  }));
  return {
    content: msg?.content || "",
    tool_calls: toolCalls.length ? toolCalls : undefined,
    prompt_tokens: j.usage?.prompt_tokens || 0,
    completion_tokens: j.usage?.completion_tokens || 0,
  };
}

async function callGemini(apiKey: string, model: string, messages: any[], tools: ToolDef[], maxTokens: number): Promise<LlmResponse> {
  const systemMsg = messages.find((m) => m.role === "system");
  const contents = messages.filter((m) => m.role !== "system").map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }],
  }));
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
        contents,
        tools: tools.length ? [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: t.input_schema })) }] : undefined,
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    },
  );
  if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${await resp.text()}`);
  const j = await resp.json();
  const part = j.candidates?.[0]?.content?.parts?.[0];
  const fc = part?.functionCall;
  return {
    content: part?.text || "",
    tool_calls: fc ? [{ id: `gem_${Date.now()}`, name: fc.name, arguments: fc.args || {} }] : undefined,
    prompt_tokens: j.usageMetadata?.promptTokenCount || 0,
    completion_tokens: j.usageMetadata?.candidatesTokenCount || 0,
  };
}
