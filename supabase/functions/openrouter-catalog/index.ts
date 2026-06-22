// Edge function admin-only: faz proxy/cache do catálogo OpenRouter
// (https://openrouter.ai/api/v1/models). Devolve lista normalizada pra UI
// de admin escolher modelos novos sem precisar editar SQL.
//
// Fluxo:
//   1. Admin abre dialog "Adicionar modelo" no AdminLLMsTab
//   2. UI chama esta função (cache de 30min)
//   3. UI mostra lista com filtros/busca
//   4. Admin clica "Adicionar" → upsert direto em available_llms via supabase
//
// Reqs: caller precisa ser admin (checa via is_admin RPC).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  architecture?: {
    modality?: string;
    tokenizer?: string;
    instruct_type?: string | null;
  };
  pricing?: {
    prompt?: string;
    completion?: string;
    request?: string;
    image?: string;
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  per_request_limits?: unknown;
  supported_parameters?: string[];
}

interface NormalizedModel {
  model_id: string;
  display_name: string;
  provider: string;
  description: string | null;
  context_length: number | null;
  supports_tools: boolean;
  supports_streaming: boolean;
  modality: string | null;
  prompt_price_per_million_usd: number | null;
  completion_price_per_million_usd: number | null;
  is_free: boolean;
}

let cache: { at: number; data: NormalizedModel[] } | null = null;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

function normalize(m: OpenRouterModel): NormalizedModel {
  const provider = m.id.split("/")[0] ?? "unknown";
  // OpenRouter retorna preço em USD por TOKEN como string ("0.000005").
  // Multiplica por 1M pra ter USD/1M tokens — mais legível.
  const promptUsdPerToken = m.pricing?.prompt ? Number(m.pricing.prompt) : 0;
  const completionUsdPerToken = m.pricing?.completion ? Number(m.pricing.completion) : 0;
  const promptPer1M = promptUsdPerToken > 0 ? +(promptUsdPerToken * 1_000_000).toFixed(4) : 0;
  const completionPer1M = completionUsdPerToken > 0 ? +(completionUsdPerToken * 1_000_000).toFixed(4) : 0;
  const isFree = promptPer1M === 0 && completionPer1M === 0;

  // Detecta tools via supported_parameters. "tools" ou "tool_choice" no array
  // significa que o modelo aceita function calling.
  const sp = m.supported_parameters ?? [];
  const supportsTools = sp.includes("tools") || sp.includes("tool_choice");
  const supportsStreaming = sp.includes("stream") || sp.length === 0; // padrão: assume sim

  return {
    model_id: m.id,
    display_name: m.name || m.id,
    provider,
    description: m.description?.slice(0, 300) ?? null,
    context_length: m.context_length ?? m.top_provider?.context_length ?? null,
    supports_tools: supportsTools,
    supports_streaming: supportsStreaming,
    modality: m.architecture?.modality ?? null,
    prompt_price_per_million_usd: isFree ? null : promptPer1M,
    completion_price_per_million_usd: isFree ? null : completionPer1M,
    is_free: isFree,
  };
}

async function fetchCatalog(): Promise<NormalizedModel[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return cache.data;
  }
  const resp = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { "Content-Type": "application/json" },
  });
  if (!resp.ok) {
    throw new Error(`OpenRouter API ${resp.status}: ${await resp.text()}`);
  }
  const json = await resp.json();
  const rawList: OpenRouterModel[] = json?.data ?? [];
  const normalized = rawList.map(normalize);
  cache = { at: now, data: normalized };
  return normalized;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Auth: precisa ser admin. Usa o JWT do user, valida via is_admin RPC.
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "INVALID_TOKEN" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Checa role: precisa ser platform_owner ou platform_admin
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "platform_owner" && role !== "platform_admin") {
    return new Response(JSON.stringify({ error: "FORBIDDEN", message: "Apenas admin Aikortex" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Body opcional pra invalidar cache (supabase.functions.invoke não passa
    // query string, então tudo via body POST).
    let body: { force?: boolean } = {};
    if (req.method === "POST") {
      try { body = await req.json(); } catch { /* ignora corpo vazio */ }
    }
    if (body.force) cache = null;

    const models = await fetchCatalog();

    return new Response(
      JSON.stringify({
        ok: true,
        total: models.length,
        cached_at: cache?.at ? new Date(cache.at).toISOString() : null,
        models,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("[openrouter-catalog] error:", e);
    return new Response(
      JSON.stringify({ error: "FETCH_FAILED", message: String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
