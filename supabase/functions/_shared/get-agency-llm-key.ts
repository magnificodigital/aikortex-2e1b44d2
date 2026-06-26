// Helper compartilhado pra ler a chave LLM da agencia/cliente.
//
// IMPORTANTE: Spark eh assistente da AGENCIA. Cada chamada consome
// tokens da chave LLM PROPRIA dela. Aikortex NAO banca conta de
// agencia — sem chave configurada, Spark recusa.
//
// Cascata de prioridade (mais especifica → mais generica):
//   1. openrouter   (gateway, suporta 200+ modelos, mais flexivel)
//   2. anthropic    (Claude direto)
//   3. openai       (GPT direto)
//   4. gemini       (Gemini direto)
//
// Retorna a primeira chave encontrada + qual provider. Edge function
// usa o provider pra montar a chamada correta (endpoint, headers, etc.).

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type LlmProvider = "openrouter" | "anthropic" | "openai" | "gemini";

export interface AgencyLlmConfig {
  provider: LlmProvider;
  apiKey: string;
  /** Modelo padrao configurado pela agencia em /admin?tab=api-keys ou no agente.
   *  null = usar default do provider (Spark monta um sensible default por provider). */
  defaultModel: string | null;
}

/** Le chave LLM da agencia. Retorna null se NENHUM provider configurado. */
export async function getAgencyLlmKey(
  admin: SupabaseClient,
  userId: string,
): Promise<AgencyLlmConfig | null> {
  const { data } = await admin
    .from("user_api_keys")
    .select("provider, api_key")
    .eq("user_id", userId)
    .in("provider", ["openrouter", "anthropic", "openai", "gemini"]);

  const keys = new Map<string, string>();
  (data ?? []).forEach((row: any) => {
    if (row?.api_key) keys.set(row.provider, row.api_key);
  });

  // Cascade na ordem de prioridade
  const order: LlmProvider[] = ["openrouter", "anthropic", "openai", "gemini"];
  for (const provider of order) {
    const apiKey = keys.get(provider);
    if (apiKey) {
      const defaultModel = await getDefaultModelForProvider(admin, provider);
      return { provider, apiKey, defaultModel };
    }
  }
  return null;
}

/** Le modelo padrao da plataforma (/admin?tab=api-keys → Modelo padrao). */
async function getDefaultModelForProvider(
  admin: SupabaseClient,
  provider: LlmProvider,
): Promise<string | null> {
  const key = `${provider}_default_model`;
  const { data } = await admin
    .from("platform_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return (data as { value?: string } | null)?.value || null;
}

/** Sensible default por provider quando nenhum modelo configurado. */
export function fallbackModelForProvider(provider: LlmProvider): string {
  switch (provider) {
    case "openrouter": return "anthropic/claude-haiku-4-5";
    case "anthropic": return "claude-haiku-4-5";
    case "openai": return "gpt-4o-mini";
    case "gemini": return "gemini-2.5-flash";
  }
}

/** Resposta padrao quando agencia nao tem LLM configurado. */
export function noLlmConfiguredError() {
  return {
    error: "no_llm_configured",
    message:
      "Configure sua chave LLM em Configurações → Provedores pra ativar o Spark. " +
      "Recomendamos Claude Haiku ou Gemini Flash pra custo baixo.",
    action: { type: "navigate", url: "/settings?tab=providers" },
  };
}
