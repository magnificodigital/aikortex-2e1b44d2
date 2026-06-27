// stark-chat
// ==========
// Stark conversacional com tool calling. Diferente de stark-voice (que faz
// criação de agente linear), este aqui responde perguntas de GESTÃO via tools.
//
// Fluxo:
//   1. STT (ElevenLabs Scribe ou texto direto)
//   2. LLM da AGÊNCIA com tools registradas (precisa de chave própria)
//   3. Loop de tool execution até resposta final
//   4. TTS (ElevenLabs com stark_voice_id da agência)
//   5. Telemetria → stark_usage
//
// Acessos:
// - Tools rodam com client AUTENTICADO do user → RLS auto-filtra
// - LLM usa chave da agência → conta vem pra eles
// - Stark NÃO usa platform OPENROUTER_API_KEY (precisa setar próprio)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  getAgencyLlmKey,
  fallbackModelForProvider,
  noLlmConfiguredError,
  type LlmProvider,
} from "../_shared/get-agency-llm-key.ts";
import { STARK_TOOL_DEFS, executeTool } from "../_shared/stark-tools.ts";
import { isProviderActive } from "../_shared/is-provider-active.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "x-stark-transcript, x-stark-reply, x-stark-tools-called, x-stark-tokens",
};

const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Sarah
const TTS_MODEL = "eleven_flash_v2_5";
const STT_MODEL = "scribe_v1";
const MAX_TOOL_ITERATIONS = 5;

const ACTION_RULES = `AÇÃO:
- Use as TOOLS pra responder com dados REAIS — nunca invente números
- Se a tool retornar count=0, diga "nenhum registro" ou "nada hoje"
- Se faltar info (qual agente?), pergunte UMA coisa específica

ZERO frases vazias.`;

const PRESET_PERSONAS: Record<string, string> = {
  jarvis: `Você é o Stark, copiloto da plataforma Aikortex — pense em Jarvis do Tony Stark.

PERSONA:
- Confiante, calmo, eficiente
- Voz pela TTS — então: SEM markdown, listas, emojis, code blocks
- Respostas CURTAS: máximo 25 palavras, 1 a 2 frases
- Direto ao ponto, zero "vou agora", "que ótima ideia"

EXEMPLOS DO TOM:
- "12 qualificações. Todas via WhatsApp."
- "Receita do mês: 11 mil reais."
- "Nada hoje. Quer ver de ontem?"
- "Qual agente — SDR ou SAC?"`,
  profissional: `Você é o Stark, copiloto da plataforma Aikortex.

PERSONA:
- Tom corporativo, objetivo, formal
- SEM markdown, listas, emojis (voz pela TTS)
- Respostas CURTAS: máximo 25 palavras
- Use linguagem de negócios — "performance", "indicadores", "métricas"`,
  casual: `Você é o Stark, copiloto da plataforma Aikortex.

PERSONA:
- Tom descontraído, amigável, próximo
- SEM markdown, listas, emojis (voz pela TTS)
- Respostas CURTAS: máximo 25 palavras
- Pode usar "tá", "beleza", "show" sem exagerar`,
};

const DEFAULT_PRESET = "jarvis";

function buildSystemPrompt(prefs: {
  persona_preset?: string | null;
  persona_prompt?: string | null;
  user_name?: string | null;
} | null): string {
  const preset = prefs?.persona_preset || DEFAULT_PRESET;
  const base = preset === "custom" && prefs?.persona_prompt
    ? prefs.persona_prompt.trim()
    : (PRESET_PERSONAS[preset] ?? PRESET_PERSONAS[DEFAULT_PRESET]);
  const nameLine = prefs?.user_name
    ? `\n\nTrate o usuário como "${prefs.user_name.trim()}".`
    : "";
  return `${base}${nameLine}\n\n${ACTION_RULES}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const t0 = Date.now();
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing_auth" }, 401);

    const supaUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supaUser.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── Inputs ─────────────────────────────────────────────────────
    let userText = "";
    let history: Array<{ role: "user" | "assistant"; content: string }> = [];

    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const audio = form.get("audio");
      const historyRaw = form.get("history");
      if (historyRaw && typeof historyRaw === "string") {
        try { history = JSON.parse(historyRaw); } catch { /* */ }
      }

      // STT precisa de ElevenLabs key DO USER
      if (audio && audio instanceof File) {
        if (!(await isProviderActive(admin, "elevenlabs"))) {
          return json({ error: "provider_disabled", message: "ElevenLabs desativado pelo admin." }, 503);
        }
        const { data: ekRow } = await admin
          .from("user_api_keys")
          .select("api_key")
          .eq("user_id", userId)
          .eq("provider", "elevenlabs")
          .maybeSingle();
        const elevenKey = (ekRow as { api_key?: string } | null)?.api_key || "";
        if (!elevenKey) {
          return json({
            error: "elevenlabs_not_configured",
            message: "Configure sua chave ElevenLabs em Configurações → Integrações → Voz.",
          }, 400);
        }
        const sttForm = new FormData();
        sttForm.append("file", audio, audio.name || "audio.webm");
        sttForm.append("model_id", STT_MODEL);
        const sttResp = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
          method: "POST",
          headers: { "xi-api-key": elevenKey },
          body: sttForm,
        });
        if (!sttResp.ok) {
          const t = await sttResp.text();
          return json({ error: "stt_failed", message: "Não entendi o áudio", details: t.slice(0, 200) }, 400);
        }
        const sttJson = await sttResp.json();
        userText = (sttJson?.text ?? "").trim();
      } else {
        const text = form.get("text");
        if (typeof text === "string") userText = text.trim();
      }
    } else {
      const body = await req.json().catch(() => ({}));
      userText = String(body?.text ?? "").trim();
      if (Array.isArray(body?.history)) history = body.history;
    }

    if (!userText) {
      return json({ error: "empty_input", message: "Não entendi a fala." }, 400);
    }

    // ── LLM da agência (precisa ter próprio) ────────────────────────
    const llmCfg = await getAgencyLlmKey(admin, userId);
    if (!llmCfg) return json(noLlmConfiguredError(), 400);

    const model = llmCfg.defaultModel || fallbackModelForProvider(llmCfg.provider);

    // ── Persona customizada do user (Configuracoes > Stark) ────────
    const { data: prefsRow } = await admin
      .from("stark_user_prefs")
      .select("persona_preset, persona_prompt, user_name")
      .eq("user_id", userId)
      .maybeSingle();
    const systemPrompt = buildSystemPrompt(prefsRow as any);

    // ── Loop de tool calling ────────────────────────────────────────
    const toolsCalled: string[] = [];
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    const messages: Array<any> = [
      { role: "system", content: systemPrompt },
      ...history.slice(-8),
      { role: "user", content: userText },
    ];

    let finalReply = "";

    for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
      const llmResp = await callLlm(llmCfg.provider, llmCfg.apiKey, model, messages, STARK_TOOL_DEFS);
      totalPromptTokens += llmResp.prompt_tokens;
      totalCompletionTokens += llmResp.completion_tokens;

      // Resposta final (sem tool call)
      if (llmResp.content && (!llmResp.tool_calls || llmResp.tool_calls.length === 0)) {
        finalReply = llmResp.content;
        break;
      }

      // Tool calls — executa e adiciona resultado ao histórico
      if (llmResp.tool_calls && llmResp.tool_calls.length > 0) {
        messages.push({ role: "assistant", content: llmResp.content || "", tool_calls: llmResp.tool_calls });
        for (const tc of llmResp.tool_calls) {
          toolsCalled.push(tc.name);
          const result = await executeTool(tc.name, tc.arguments, { supa: supaUser, userId });
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            name: tc.name,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      // Sem content nem tool — break por segurança
      finalReply = "Desculpe, não consegui processar.";
      break;
    }

    if (!finalReply) finalReply = "Sem resposta. Tente reformular.";

    // ── TTS (ElevenLabs com stark_voice_id) ─────────────────────────
    const { data: ekRow } = await admin
      .from("user_api_keys")
      .select("api_key")
      .eq("user_id", userId)
      .eq("provider", "elevenlabs")
      .maybeSingle();
    const elevenKey = (ekRow as { api_key?: string } | null)?.api_key || "";

    let audioB64 = "";
    if (elevenKey && (await isProviderActive(admin, "elevenlabs"))) {
      const { data: voiceRow } = await admin
        .from("user_api_keys")
        .select("api_key")
        .eq("user_id", userId)
        .eq("provider", "stark_voice_id")
        .maybeSingle();
      const voiceId = (voiceRow as { api_key?: string } | null)?.api_key || DEFAULT_VOICE_ID;

      const ttsResp = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_22050_32`,
        {
          method: "POST",
          headers: { "xi-api-key": elevenKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            text: finalReply,
            model_id: TTS_MODEL,
            voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.1, use_speaker_boost: true },
          }),
        },
      );
      if (ttsResp.ok) {
        const buf = new Uint8Array(await ttsResp.arrayBuffer());
        audioB64 = base64Encode(buf);
      }
    }

    // ── Telemetria ─────────────────────────────────────────────────
    const totalTokens = totalPromptTokens + totalCompletionTokens;
    const durationMs = Date.now() - t0;
    try {
      await admin.from("stark_usage").insert({
        user_id: userId,
        llm_provider: llmCfg.provider,
        llm_model: model,
        prompt_tokens: totalPromptTokens,
        completion_tokens: totalCompletionTokens,
        total_tokens: totalTokens,
        tools_called: toolsCalled,
        duration_ms: durationMs,
      });
    } catch (e) { console.warn("[stark-chat] telemetry insert falhou:", e); }

    return json({
      transcript: userText,
      reply: finalReply,
      audio: audioB64,
      audio_mime: audioB64 ? "audio/mpeg" : null,
      tools_called: toolsCalled,
      tokens: totalTokens,
      duration_ms: durationMs,
    });
  } catch (e) {
    console.error("[stark-chat] exception:", e);
    return json({ error: "internal", message: (e as Error).message }, 500);
  }
});

// ─── LLM Dispatcher ──────────────────────────────────────────────────────

interface LlmResponse {
  content: string;
  tool_calls?: Array<{ id: string; name: string; arguments: any }>;
  prompt_tokens: number;
  completion_tokens: number;
}

async function callLlm(
  provider: LlmProvider,
  apiKey: string,
  model: string,
  messages: any[],
  tools: any[],
): Promise<LlmResponse> {
  switch (provider) {
    case "anthropic": return callAnthropic(apiKey, model, messages, tools);
    case "openrouter": return callOpenRouter(apiKey, model, messages, tools);
    case "openai": return callOpenAI(apiKey, model, messages, tools);
    case "gemini": return callGemini(apiKey, model, messages, tools);
  }
}

async function callAnthropic(apiKey: string, model: string, messages: any[], tools: any[]): Promise<LlmResponse> {
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
      max_tokens: 1024,
      tools: tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema })),
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

async function callOpenRouter(apiKey: string, model: string, messages: any[], tools: any[]): Promise<LlmResponse> {
  return callOpenAICompatible("https://openrouter.ai/api/v1/chat/completions", apiKey, model, messages, tools, {
    "HTTP-Referer": "https://aikortex26.lovable.app",
    "X-Title": "Aikortex Stark",
  });
}

async function callOpenAI(apiKey: string, model: string, messages: any[], tools: any[]): Promise<LlmResponse> {
  return callOpenAICompatible("https://api.openai.com/v1/chat/completions", apiKey, model, messages, tools);
}

async function callOpenAICompatible(
  url: string, apiKey: string, model: string, messages: any[], tools: any[], extraHeaders: Record<string, string> = {},
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
      tools: tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.input_schema },
      })),
      max_tokens: 1024,
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

async function callGemini(apiKey: string, model: string, messages: any[], tools: any[]): Promise<LlmResponse> {
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
        tools: [{ functionDeclarations: tools.map((t) => ({ name: t.name, description: t.description, parameters: t.input_schema })) }],
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as unknown as number[]);
  }
  return btoa(binary);
}
