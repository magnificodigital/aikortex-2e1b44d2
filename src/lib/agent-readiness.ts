// Checklist de prontidao do agente — usado pelos dialogs de publicacao
// (PublishAgentDialog pra versionamento + PublishForClientDialog pra
// primeira publicacao comercial).

export interface ReadinessCheck {
  key: string;
  label: string;
  pass: boolean;
  /** "critical" bloqueia publicação. "recommended" só avisa */
  level: "critical" | "recommended";
  hint?: string;
}

/** Avalia o config do agente e retorna lista de checks. */
export function evaluateReadiness(cfg: Record<string, any> | null): ReadinessCheck[] {
  const checks: ReadinessCheck[] = [];
  if (!cfg) return checks;

  const name = String(cfg.name ?? "").trim();
  const objective = String(cfg.objective ?? cfg.profile?.primaryGoal ?? "").trim();
  const instructions = String(cfg.instructions ?? cfg.profile?.instructions ?? "").trim();
  const tone = String(cfg.toneOfVoice ?? cfg.businessContext?.toneOfVoice ?? "").trim();
  const greeting = String(cfg.greetingMessage ?? cfg.businessContext?.greetingMessage ?? "").trim();
  const provider = String(cfg.provider ?? "").trim();
  const capabilities = cfg.capabilities ?? {};
  const hasAnyCapability = Object.values(capabilities).some((c: any) => c === true || c?.enabled === true);
  const channels = cfg.channels;
  const channelCount = Array.isArray(channels) ? channels.length : (channels && typeof channels === "object" ? Object.values(channels).filter((v) => v === true).length : 0);
  const guardrails = Array.isArray(cfg.guardrails) ? cfg.guardrails.length : 0;
  const tools = Array.isArray(cfg.enabledTools) ? cfg.enabledTools.length : 0;

  // ── Críticos ──
  checks.push({
    key: "name",
    label: "Nome do agente definido",
    pass: name.length >= 2,
    level: "critical",
  });
  checks.push({
    key: "objective",
    label: "Objetivo escrito",
    pass: objective.length >= 10,
    level: "critical",
    hint: !objective ? "Define em Agente → Cargo/Função" : undefined,
  });
  checks.push({
    key: "instructions",
    label: "Instruções do agente",
    pass: instructions.length >= 100,
    level: "critical",
    hint: instructions.length < 100 ? "Mínimo 100 caracteres em Agente → Instruções" : undefined,
  });
  const llmReady = !!provider && provider !== "aikortex" && provider !== "auto";
  checks.push({
    key: "llm",
    label: "Chave LLM real conectada (não Aikortex)",
    pass: llmReady,
    level: "critical",
    hint: !llmReady ? "Conecta OpenAI/Anthropic/Gemini em Integrações → LLMs" : undefined,
  });

  // ── Recomendados ──
  checks.push({
    key: "capability",
    label: "Pelo menos 1 capacidade cognitiva",
    pass: hasAnyCapability,
    level: "recommended",
    hint: !hasAnyCapability ? "Ative Raciocínio ou Memória em Capacidades" : undefined,
  });
  checks.push({
    key: "tone",
    label: "Tom de voz definido",
    pass: tone.length >= 3,
    level: "recommended",
  });
  checks.push({
    key: "greeting",
    label: "Mensagem de saudação",
    pass: greeting.length >= 10,
    level: "recommended",
    hint: !greeting ? "Define em Agente → Mensagem de saudação" : undefined,
  });
  checks.push({
    key: "channel",
    label: "Pelo menos 1 canal configurado",
    pass: channelCount > 0,
    level: "recommended",
    hint: channelCount === 0 ? "Conecta WhatsApp ou Email em Canais" : undefined,
  });
  checks.push({
    key: "guardrails",
    label: "Limites configurados",
    pass: guardrails > 0,
    level: "recommended",
    hint: guardrails === 0 ? "Marca em Capacidades → Limites o que NUNCA pode" : undefined,
  });
  checks.push({
    key: "tools",
    label: "Ferramentas habilitadas",
    pass: tools > 0,
    level: "recommended",
  });

  return checks;
}
