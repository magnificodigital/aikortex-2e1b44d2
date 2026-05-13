// ai-gateway: thin compatibility wrapper around the shared `callLLM` helper.
// Single source of truth for models = `available_llms` (read by callLLM).
// BYOK path still supported (caller passes byok_key + provider).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callLLM, buildAdminClient } from "../_shared/llm-fallback.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

// Reference map for BYOK requests (caller-supplied api key per provider)
const BYOK_DEFAULT_MODELS: Record<string, { fast: string; smart: string }> = {
  openai:    { fast: "openai/gpt-4o-mini",          smart: "openai/gpt-4o" },
  gemini:    { fast: "google/gemini-2.5-flash",     smart: "google/gemini-2.5-pro" },
  anthropic: { fast: "anthropic/claude-3-5-haiku",  smart: "anthropic/claude-sonnet-4.5" },
  deepseek:  { fast: "deepseek/deepseek-chat",      smart: "deepseek/deepseek-r1" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth: require valid JWT (user) or service role key
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (token !== SERVICE_KEY) {
    const { data: { user }, error } = await adminClient.auth.getUser(token);
    if (error || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const body = await req.json();
    const {
      messages,
      system,
      mode = "chat",
      provider,
      byok_key,
      quality = "fast",
      model_override,
    } = body;

    const finalMessages = system
      ? [{ role: "system", content: system }, ...messages]
      : messages;

    const isStream = mode === "stream";
    const isJsonMode = mode === "structure" || mode === "build";

    // BYOK path: caller-supplied API key per provider
    if (byok_key && provider && BYOK_DEFAULT_MODELS[provider]) {
      const model = model_override || BYOK_DEFAULT_MODELS[provider][quality as "fast" | "smart"]
        || BYOK_DEFAULT_MODELS[provider].fast;
      const result = await callLLM(finalMessages, {
        apiKey: byok_key,
        fallbackModels: [model],
        stream: isStream,
        maxTokens: isJsonMode ? 8192 : 4096,
        responseFormat: isJsonMode && !isStream ? { type: "json_object" } : undefined,
        timeoutMs: 30000,
      });
      return buildAiGatewayResponse(result, isStream);
    }

    // Platform free models — single source of truth
    const result = await callLLM(finalMessages, {
      tier: "free",
      preferredModel: model_override,
      stream: isStream,
      maxTokens: isJsonMode ? 8192 : 4096,
      responseFormat: isJsonMode && !isStream ? { type: "json_object" } : undefined,
      timeoutMs: 30000,
    }, buildAdminClient());

    return buildAiGatewayResponse(result, isStream);
  } catch (e) {
    console.error("ai-gateway error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildAiGatewayResponse(result: Awaited<ReturnType<typeof callLLM>>, isStream: boolean): Response {
  if (!result.success) {
    let errMsg = result.error || "Serviço de IA indisponível. Tente novamente.";
    let status = result.status_code || 500;
    if (status === 402) errMsg = "Créditos insuficientes. Verifique sua chave de API.";
    else if (status === 401) errMsg = "Chave de API inválida.";
    else if (status === 429) errMsg = "Limite atingido. Tente novamente em instantes.";
    if (status < 400 || status >= 600) status = 500;
    return new Response(JSON.stringify({ error: errMsg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (isStream && result.response) {
    return new Response(result.response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  }

  return new Response(JSON.stringify({
    content: result.content ?? "",
    model: result.model_used,
    usage: (result.raw as any)?.usage,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
