/**
 * Overlays the published agent_versions.config_snapshot onto an agent row's `config`
 * so runtime functions always run the production-pinned configuration.
 *
 * Falls back to the raw `config` if no version has been published yet
 * (backward-compatible with agents created before the versioning system).
 */
export async function overlayPublishedConfig<T extends { published_version_id?: string | null; config?: any }>(
  supabase: any,
  agent: T | null | undefined,
): Promise<T | null | undefined> {
  if (!agent || !agent.published_version_id) return agent;
  const { data: v } = await supabase
    .from("agent_versions")
    .select("config_snapshot")
    .eq("id", agent.published_version_id)
    .maybeSingle();
  if (v?.config_snapshot) {
    (agent as any).config = v.config_snapshot;
  }
  return agent;
}

/* ── Capabilities runtime addons (Aikortex Master v7.4 §13.6 — Sprint 2.3) ── */

type Capabilities = {
  planning?: { enabled?: boolean; max_steps?: number };
  reasoning?: { enabled?: boolean; depth?: "low" | "medium" | "high" };
  // memory / code_runtime / auto_integration não injetam prompt addons
};

const REASONING_INSTRUCTION: Record<string, string> = {
  low: "Use raciocínio breve antes de responder, focado nos pontos críticos.",
  medium:
    "Use raciocínio passo-a-passo (chain-of-thought) antes de responder, considerando alternativas e validando suposições.",
  high:
    "Use raciocínio aprofundado antes de responder: enumere alternativas, considere edge cases, valide suposições explicitamente, e só então formule a resposta final.",
};

/**
 * Appends Planning/Reasoning addon sections to a base system prompt
 * according to the agent's `config.capabilities`. Returns the prompt
 * unchanged when capabilities are absent or all disabled.
 */
export function applyCapabilityAddons(basePrompt: string, capabilities: Capabilities | undefined | null): string {
  if (!capabilities) return basePrompt;
  const addons: string[] = [];

  if (capabilities.planning?.enabled) {
    const maxSteps = capabilities.planning.max_steps ?? 10;
    addons.push(
      `\n## Planejamento\nAntes de responder, decomponha a solicitação em até ${maxSteps} passos e os execute em ordem. Apresente brevemente o plano antes da resposta final quando a tarefa for complexa.`,
    );
  }

  if (capabilities.reasoning?.enabled) {
    const depth = capabilities.reasoning.depth ?? "medium";
    addons.push(`\n## Raciocínio\n${REASONING_INSTRUCTION[depth] ?? REASONING_INSTRUCTION.medium}`);
  }

  if (addons.length === 0) return basePrompt;
  return basePrompt + "\n" + addons.join("\n");
}

/**
 * Sprint 2.5-e.2 — Injects tool-usage hints into the system prompt so weaker
 * LLMs are explicitly nudged to invoke `knowledge_search` (and other tools)
 * instead of answering from parametric memory.
 */
export function applyToolsHints(
  systemPrompt: string,
  enabledTools: Array<{ function?: { name?: string } } | { tool_key?: string }> | undefined | null,
): string {
  if (!enabledTools || enabledTools.length === 0) return systemPrompt;
  const toolNames = enabledTools
    .map((t: any) => t?.function?.name ?? t?.tool_key)
    .filter(Boolean) as string[];
  if (toolNames.length === 0) return systemPrompt;

  const hints: string[] = [];
  if (toolNames.includes("knowledge_search")) {
    hints.push(
      "IMPORTANTE: Você tem acesso a uma Base de Conhecimento com documentos específicos deste contexto. " +
        "SEMPRE use a ferramenta `knowledge_search` PRIMEIRO quando o usuário perguntar sobre preços, " +
        "planos, horários, procedimentos, políticas, produtos ou qualquer informação factual. " +
        "Só responda com base no que estiver lá. Se a busca retornar vazio, diga que não tem essa informação " +
        "e ofereça encaminhar para um humano.",
    );
  }
  if (toolNames.includes("web_search")) {
    hints.push("Você pode usar `web_search` para fatos atuais (notícias, preços de mercado, eventos recentes).");
  }
  if (toolNames.includes("image_gen")) {
    hints.push("Você pode usar `image_gen` para gerar imagens quando o usuário pedir.");
  }
  if (toolNames.includes("table_read")) {
    hints.push(
      "IMPORTANTE — table_read: você tem acesso a TABELAS de dados estruturadas relacionadas ao seu propósito. " +
        "SEMPRE use quando o usuário perguntar por registros específicos. " +
        "`filter` é um OBJETO com chave-valor, exemplo: { \"nome\": \"Maria\" }. " +
        "NUNCA coloque valores de filtro no topo do payload — sempre dentro de `filter`. " +
        "Exemplo: { \"table_name\": \"NomeDaTabela\", \"filter\": { \"nome\": \"Maria\" }, \"limit\": 10 }",
    );
  }
  if (toolNames.includes("table_write")) {
    hints.push(
      "IMPORTANTE — table_write: SEMPRE coloque os valores das colunas DENTRO de um objeto `data` (insert/update). " +
        "Para update/delete, SEMPRE forneça `filter` com chave-valor para identificar registros. " +
        "Confirme com o usuário antes de UPDATE ou DELETE. Exemplos:\n" +
        "INSERT: { \"table_name\": \"Pacientes\", \"action\": \"insert\", \"data\": { \"nome\": \"Maria\", \"telefone\": \"11999\" } }\n" +
        "UPDATE: { \"table_name\": \"Pacientes\", \"action\": \"update\", \"filter\": { \"nome\": \"Maria\" }, \"data\": { \"telefone\": \"11888\" } }\n" +
        "DELETE: { \"table_name\": \"Pacientes\", \"action\": \"delete\", \"filter\": { \"nome\": \"Maria\" } }",
    );
  }
  if (hints.length === 0) return systemPrompt;
  return systemPrompt + "\n\n## Ferramentas disponíveis\n" + hints.join("\n\n");
}
