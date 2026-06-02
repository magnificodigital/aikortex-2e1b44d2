// Master v7.4 §13.2 — checklist granular do Modo Vibe.
// Cada campo individual vira sua pílula pra feedback imediato conforme
// as tools rodam — vê o agente sendo montado peça por peça.

// Master v7.4 §13.2 — checklist user-centric, agrupado por intenção
// (não por campo técnico). Cada item responde uma pergunta do user:
// "quem é meu agente?", "o que ele resolve?", etc.
export type WizardCheckpointId =
  | "identity"      // Quem é (nome + descrição)
  | "expertise"     // Especialidade (nicho + objetivo)
  | "personality"   // Personalidade (tom + saudação)
  | "skills"        // Habilidades (capacidades + tools)
  | "presence"      // Onde atua (canais)
  | "behavior";     // Comportamento (instruções)

export interface WizardCheckpoint {
  id: WizardCheckpointId;
  label: string;
  done: boolean;
}

// Master v7.4 §13.2 — 4 blocos canônicos do Modo Vibe
export type WizardPhaseId = "profile" | "integrations" | "criteria" | "flow" | "done";

export interface WizardPhase {
  id: WizardPhaseId;
  label: string;
  index: number; // 1-based pra UI ("Fase 1 de 4")
  checkpointIds: WizardCheckpointId[];
}

const PHASES: WizardPhase[] = [
  { id: "profile",      label: "Perfil",      index: 1, checkpointIds: ["identity", "expertise", "personality"] },
  { id: "integrations", label: "Integrações", index: 2, checkpointIds: ["skills", "presence"] },
  { id: "criteria",     label: "Critérios",   index: 3, checkpointIds: ["behavior"] },
  { id: "flow",         label: "Fluxo",       index: 4, checkpointIds: [] },
];

const TOTAL_PHASES = PHASES.length;

export function computeWizardProgress(savedConfig: Record<string, any> | null | undefined): {
  checkpoints: WizardCheckpoint[];
  doneCount: number;
  totalCount: number;
  pct: number;
  currentPhase: WizardPhase | null; // null quando tudo done
  totalPhases: number;
} {
  const cfg = savedConfig || {};
  const ctx = (cfg as any).businessContext || {};
  const profile = (cfg as any).profile || {};
  // Channels pode vir como array OU como objeto {whatsapp:true,email:false}
  // (agent-vibe-mutate salva como objeto; UI manual salva como array).
  const channelsAny = (cfg as any).channels;
  const channelsActive = Array.isArray(channelsAny)
    ? channelsAny.length > 0
    : !!channelsAny && typeof channelsAny === "object" && Object.values(channelsAny).some((v) => v === true);
  // Capabilities: vibe-mutate salva {enabled: bool} OU bool direto (legacy)
  const capsActive = (() => {
    const caps = (cfg as any)?.capabilities ?? {};
    return Object.values(caps).some((c: any) => c === true || c?.enabled === true);
  })();
  // Tools runtime habilitadas (web_search, table_write, etc.)
  const toolsActive = Array.isArray((cfg as any)?.enabledTools) && (cfg as any).enabledTools.length > 0;
  // Instructions: vibe grava em profile.instructions; legacy raiz
  const instructions = (cfg as any)?.profile?.instructions ?? cfg.instructions;
  const instrLen = typeof instructions === "string" ? instructions.length : 0;
  // Greeting: vibe grava em businessContext.greetingMessage; legacy raiz
  const greeting = (cfg as any)?.businessContext?.greetingMessage || cfg.greetingMessage;

  const nameFilled = !!(cfg.name && cfg.name !== "Novo Agente" && cfg.name !== "Carregando...");
  const descFilled = !!(cfg as any)?.descriptionConfigured || !!(cfg as any)?.description;

  // Checklist USER-CENTRIC: cada item responde uma pergunta do user, não
  // um campo técnico. Agrupa fields relacionados (ex: tom+saudação = personalidade).
  const checkpoints: WizardCheckpoint[] = [
    {
      id: "identity",
      label: "Quem é o agente",
      done: nameFilled && descFilled,
    },
    {
      id: "expertise",
      label: "Especialidade",
      done: !!ctx.niche && !!(profile.primaryGoal || cfg.objective),
    },
    {
      id: "personality",
      label: "Personalidade",
      done: !!(ctx.toneOfVoice || cfg.toneOfVoice) && !!greeting,
    },
    {
      id: "skills",
      label: "Habilidades",
      done: capsActive || toolsActive,
    },
    {
      id: "presence",
      label: "Onde atua",
      done: channelsActive,
    },
    {
      id: "behavior",
      label: "Comportamento",
      done: instrLen > 1200,
    },
  ];
  const doneCount = checkpoints.filter((c) => c.done).length;
  const totalCount = checkpoints.length;
  const pct = Math.round((doneCount / totalCount) * 100);

  // Fase atual = primeira fase que ainda tem checkpoint pendente.
  // Quando todas as fases tão completas, currentPhase = null (Concluído).
  const doneById = new Map(checkpoints.map((c) => [c.id, c.done]));
  const currentPhase = PHASES.find((phase) =>
    phase.checkpointIds.some((id) => !doneById.get(id))
  ) ?? null;

  return { checkpoints, doneCount, totalCount, pct, currentPhase, totalPhases: TOTAL_PHASES };
}
