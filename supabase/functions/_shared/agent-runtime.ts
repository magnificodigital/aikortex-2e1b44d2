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
