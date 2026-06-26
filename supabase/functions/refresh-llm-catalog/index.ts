// refresh-llm-catalog
// ===================
// Busca os modelos mais recentes na API de cada provedor (OpenAI, Anthropic,
// Gemini, OpenRouter) e faz upsert em available_llms. Modelos novos entram
// como active=false — admin revisa e ativa em /admin?tab=llms.
//
// Permite admin descobrir/cadastrar modelos lançados após o último update
// sem precisar editar o código.
//
// Auth: precisa de platform_owner/platform_admin via JWT.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ProviderId = "openai" | "anthropic" | "gemini" | "openrouter";

interface DiscoveredModel {
  provider: ProviderId;
  model_id: string;
  display_name: string | null;
  supports_tools?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return json({ error: "missing_auth" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Validate platform admin
    const { data: userData, error: uerr } = await admin.auth.getUser(token);
    if (uerr || !userData?.user) return json({ error: "unauthorized" }, 401);
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    const role = (profile as { role?: string } | null)?.role;
    if (role !== "platform_owner" && role !== "platform_admin") {
      return json({ error: "forbidden", message: "Apenas admin Aikortex" }, 403);
    }

    const body = await req.json().catch(() => ({})) as { provider?: ProviderId };
    const requestedProvider = body.provider;

    // Pega TODAS as chaves de uma vez (uma query so).
    const { data: keys } = await admin
      .from("platform_config")
      .select("key, value")
      .in("key", [
        "openai_api_key", "anthropic_api_key", "gemini_api_key", "openrouter_api_key",
      ]);
    const keyMap = new Map<string, string>();
    (keys ?? []).forEach((r: any) => keyMap.set(r.key, r.value || ""));

    const allDiscovered: DiscoveredModel[] = [];
    const results: Record<string, { count: number; new: number; updated: number; error?: string }> = {};

    const providers: ProviderId[] = requestedProvider
      ? [requestedProvider]
      : ["openai", "anthropic", "gemini", "openrouter"];

    for (const provider of providers) {
      try {
        const models = await fetchModels(provider, keyMap);
        allDiscovered.push(...models);

        // Upsert em available_llms
        const stats = await upsertModels(admin, models);
        results[provider] = { count: models.length, ...stats };
      } catch (e) {
        results[provider] = { count: 0, new: 0, updated: 0, error: (e as Error).message };
      }
    }

    return json({
      ok: true,
      total_discovered: allDiscovered.length,
      by_provider: results,
    });
  } catch (e) {
    return json({ error: "internal", message: (e as Error).message }, 500);
  }
});

async function fetchModels(provider: ProviderId, keyMap: Map<string, string>): Promise<DiscoveredModel[]> {
  switch (provider) {
    case "openai": {
      const key = keyMap.get("openai_api_key");
      if (!key) throw new Error("OpenAI API key não configurada");
      const r = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!r.ok) throw new Error(`OpenAI ${r.status}`);
      const j = await r.json();
      return (j.data || [])
        .filter((m: any) => {
          const id = String(m.id || "");
          // Filtro: so modelos relevantes (gpt-*, o*, chatgpt-*, etc)
          return /^(gpt-|o\d|chatgpt-|gpt$)/i.test(id) && !id.includes("instruct") && !id.includes("audio") && !id.includes("realtime") && !id.includes("transcribe") && !id.includes("tts") && !id.includes("embedding") && !id.includes("moderation") && !id.includes("dall-e") && !id.includes("whisper");
        })
        .map((m: any) => ({
          provider: "openai" as const,
          model_id: m.id,
          display_name: m.id,
          supports_tools: true,
        }));
    }
    case "anthropic": {
      const key = keyMap.get("anthropic_api_key");
      if (!key) throw new Error("Anthropic API key não configurada");
      const r = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
      });
      if (!r.ok) throw new Error(`Anthropic ${r.status}`);
      const j = await r.json();
      return (j.data || []).map((m: any) => ({
        provider: "anthropic" as const,
        model_id: m.id,
        display_name: m.display_name || m.id,
        supports_tools: true,
      }));
    }
    case "gemini": {
      const key = keyMap.get("gemini_api_key");
      if (!key) throw new Error("Gemini API key não configurada");
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
      if (!r.ok) throw new Error(`Gemini ${r.status}`);
      const j = await r.json();
      return (j.models || [])
        .filter((m: any) => {
          const name = String(m.name || "");
          const supports = Array.isArray(m.supportedGenerationMethods) ? m.supportedGenerationMethods : [];
          return name.startsWith("models/gemini-") && supports.includes("generateContent");
        })
        .map((m: any) => ({
          provider: "gemini" as const,
          model_id: String(m.name).replace("models/", ""),
          display_name: m.displayName || String(m.name).replace("models/", ""),
          supports_tools: Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"),
        }));
    }
    case "openrouter": {
      // OpenRouter expoe catalogo publicamente — nao precisa de auth pra listar.
      const r = await fetch("https://openrouter.ai/api/v1/models");
      if (!r.ok) throw new Error(`OpenRouter ${r.status}`);
      const j = await r.json();
      return (j.data || []).map((m: any) => ({
        provider: "openrouter" as const,
        model_id: m.id,
        display_name: m.name || m.id,
        supports_tools: Array.isArray(m.supported_parameters) && m.supported_parameters.includes("tools"),
      }));
    }
  }
}

async function upsertModels(admin: any, models: DiscoveredModel[]): Promise<{ new: number; updated: number }> {
  if (models.length === 0) return { new: 0, updated: 0 };

  // Checa quais ja existem (por model_id + provider)
  const { data: existing } = await admin
    .from("available_llms")
    .select("model_id, provider")
    .in("model_id", models.map((m) => m.model_id));
  const existingKeys = new Set<string>((existing ?? []).map((r: any) => `${r.provider}:${r.model_id}`));

  let novos = 0;
  let updated = 0;
  for (const m of models) {
    const exists = existingKeys.has(`${m.provider}:${m.model_id}`);
    if (exists) {
      // Atualiza display_name e supports_tools (nao mexe em active/tier/priority).
      await admin
        .from("available_llms")
        .update({
          display_name: m.display_name,
          supports_tools: m.supports_tools ?? false,
        })
        .eq("provider", m.provider)
        .eq("model_id", m.model_id);
      updated++;
    } else {
      // Novo — entra com active=false pra admin revisar.
      await admin
        .from("available_llms")
        .insert({
          provider: m.provider,
          model_id: m.model_id,
          display_name: m.display_name,
          supports_tools: m.supports_tools ?? false,
          tier: "paid",
          priority: 100,
          status: "unknown",
          active: false,
        });
      novos++;
    }
  }
  return { new: novos, updated };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
