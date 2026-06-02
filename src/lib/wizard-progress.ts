// Master v7.4 §13.2 — checklist granular do Modo Vibe.
// Cada campo individual vira sua pílula pra feedback imediato conforme
// as tools rodam — vê o agente sendo montado peça por peça.

export type WizardCheckpointId =
  | "niche" | "name" | "description" | "tone" | "objective"
  | "capabilities" | "channels" | "criteria" | "greeting";

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
  { id: "profile",      label: "Perfil",      index: 1, checkpointIds: ["niche", "name", "description", "tone"] },
  { id: "integrations", label: "Integrações", index: 2, checkpointIds: ["channels", "capabilities"] },
  { id: "criteria",     label: "Critérios",   index: 3, checkpointIds: ["objective", "criteria"] },
  { id: "flow",         label: "Fluxo",       index: 4, checkpointIds: ["greeting"] },
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
  // Capabilities: vibe-mutate salva como boolean direto (capabilities[key] = true)
  const capsActive = (() => {
    const caps = (cfg as any)?.capabilities ?? {};
    return Object.values(caps).some((c: any) => c === true || c?.enabled === true);
  })();
  const checkpoints: WizardCheckpoint[] = [
    { id: "niche",       label: "Nicho",        done: !!ctx.niche },
    { id: "name",        label: "Nome",         done: !!(cfg.name && cfg.name !== "Novo Agente" && cfg.name !== "Carregando...") },
    { id: "description", label: "Descrição",    done: !!(cfg as any)?.descriptionConfigured },
    { id: "tone",        label: "Tom de voz",   done: !!(ctx.toneOfVoice || cfg.toneOfVoice) },
    { id: "objective",   label: "Objetivo",     done: !!(profile.primaryGoal || cfg.objective) },
    { id: "capabilities", label: "Capacidades", done: capsActive },
    { id: "channels",    label: "Canais",       done: channelsActive },
    // Instructions: vibe grava em profile.instructions; legacy raiz.
    // Exige ≥1200 chars pra refletir as 7 seções obrigatórias (identidade, tom,
    // fluxo, critérios, regras, exceções, exemplos) — abaixo disso é raso.
    { id: "criteria",    label: "Critérios",    done: (() => {
        const instr = (cfg as any)?.profile?.instructions ?? cfg.instructions;
        return !!(typeof instr === "string" && instr.length > 1200);
      })(),
    },
    // Greeting: vibe-mutate grava em businessContext.greetingMessage; legacy raiz
    { id: "greeting",    label: "Saudação",     done: !!((cfg as any)?.businessContext?.greetingMessage || cfg.greetingMessage) },
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
