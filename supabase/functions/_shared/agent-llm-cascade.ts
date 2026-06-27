// Cascade pra resolver QUAL chave LLM usar quando o agente roda em producao.
//
// Regras Master v7.4:
//   1. Se a agencia configurou OpenRouter → sempre usa OpenRouter dela (cobre
//      qualquer modelo via gateway).
//   2. Se nao tem OpenRouter mas tem chave direta (OpenAI/Anthropic/Gemini)
//      que CASA com o provider do modelo do agente → usa essa chave direta.
//   3. Se tem chave direta mas NAO casa com o modelo → erro (mismatch).
//   4. Se nao tem nada configurado → fallback Aikortex (OPENROUTER_API_KEY env).
//
// A partir do momento que a agencia configura QUALQUER chave LLM, regra (4)
// nao se aplica mais — entra (1), (2) ou (3).

import type { LlmProvider } from "./agent-llm-dispatchers.ts";

export interface AgentLlmResolution {
  provider: LlmProvider;
  apiKey: string;
  /** Modelo final a usar — o do agente quando especificado e compativel,
   *  ou default do provider quando agente nao tem modelo definido. */
  model: string;
  /** "user" = chave da agencia. "platform" = Aikortex env fallback. */
  source: "user" | "platform";
  /** Quando setado, o caller deve abortar com mensagem clara — chave configurada
   *  pela agencia nao casa com o modelo do agente. */
  mismatchError?: string;
}

/** Deduz o provider a partir do nome do modelo. */
export function detectProviderFromModel(model: string): LlmProvider | null {
  if (!model) return null;
  const m = model.toLowerCase();
  if (m.includes("/")) return "openrouter"; // openrouter ids tem "/"
  if (m.startsWith("gpt-") || m.startsWith("o1") || m.startsWith("o3") || m.startsWith("o4")) return "openai";
  if (m.startsWith("claude")) return "anthropic";
  if (m.startsWith("gemini") || m.startsWith("gemma")) return "gemini";
  return null;
}

/** Modelo default por provider, usado quando o agente nao tem model especificado
 *  no config mas a agencia tem chave configurada — evita mismatch falso. */
export function defaultModelForProvider(provider: LlmProvider): string {
  switch (provider) {
    case "openrouter": return "anthropic/claude-haiku-4-5";
    case "anthropic": return "claude-haiku-4-5";
    case "openai": return "gpt-4o-mini";
    case "gemini": return "gemini-2.5-flash";
  }
}

/** Resolve a chave LLM a usar pro agente. */
export async function resolveAgentLlm(
  supabase: any,
  agentId: string,
  agentModel?: string | null,
  platformOpenRouterKey?: string | null,
): Promise<AgentLlmResolution | null> {
  // 1) Le dono do agente
  const { data: agent } = await supabase
    .from("user_agents")
    .select("user_id")
    .eq("id", agentId)
    .maybeSingle();
  const ownerId = (agent as any)?.user_id;
  if (!ownerId) {
    return platformOpenRouterKey
      ? { provider: "openrouter", apiKey: platformOpenRouterKey, model: agentModel || defaultModelForProvider("openrouter"), source: "platform" }
      : null;
  }

  // 2) Le todas as chaves LLM da agencia
  const { data: rows } = await supabase
    .from("user_api_keys")
    .select("provider, api_key")
    .eq("user_id", ownerId)
    .in("provider", ["openrouter", "openai", "anthropic", "gemini"]);
  const keys = new Map<LlmProvider, string>();
  (rows ?? []).forEach((r: any) => {
    const k = (r?.api_key ?? "").trim();
    if (k && ["openrouter", "openai", "anthropic", "gemini"].includes(r.provider)) {
      keys.set(r.provider as LlmProvider, k);
    }
  });

  const modelProvider = agentModel ? detectProviderFromModel(agentModel) : null;

  // 3) Prioridade: OpenRouter da agencia (cobre tudo)
  const orKey = keys.get("openrouter");
  if (orKey) {
    return {
      provider: "openrouter",
      apiKey: orKey,
      model: agentModel || defaultModelForProvider("openrouter"),
      source: "user",
    };
  }

  // 4) Detecta provider do modelo e tenta chave direta da agencia
  if (modelProvider && modelProvider !== "openrouter") {
    const directKey = keys.get(modelProvider);
    if (directKey) {
      return { provider: modelProvider, apiKey: directKey, model: agentModel!, source: "user" };
    }
  }

  // 5) Agente sem modelo definido — usa a primeira chave da agencia que tiver
  //    com o default do provider. Evita mismatch falso quando config.model
  //    ainda nao foi setado pelo wizard.
  if (!agentModel && keys.size > 0) {
    const priority: LlmProvider[] = ["openai", "anthropic", "gemini"];
    for (const p of priority) {
      const k = keys.get(p);
      if (k) {
        return { provider: p, apiKey: k, model: defaultModelForProvider(p), source: "user" };
      }
    }
  }

  // 6) Agencia tem chave LLM propria mas nao cobre o modelo do agente
  if (keys.size > 0) {
    const configured = Array.from(keys.keys()).join(", ");
    return {
      provider: "openrouter",
      apiKey: "",
      model: agentModel || "",
      source: "user",
      mismatchError: `O agente usa o modelo "${agentModel}" (provider: ${modelProvider ?? "desconhecido"}), mas a agência só tem chave configurada para: ${configured}. Configure a chave correspondente em Provedores ou use um modelo compatível.`,
    };
  }

  // 7) Sem chave da agencia → fallback Aikortex (so se tiver env)
  if (platformOpenRouterKey) {
    return {
      provider: "openrouter",
      apiKey: platformOpenRouterKey,
      model: agentModel || defaultModelForProvider("openrouter"),
      source: "platform",
    };
  }
  return null;
}
