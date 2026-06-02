// Master v7.4 §13.2 — checklist granular do Modo Vibe.
// Cada campo individual vira sua pílula pra feedback imediato conforme
// as tools rodam — vê o agente sendo montado peça por peça.

export type WizardCheckpointId =
  | "niche" | "company" | "name" | "tone" | "objective"
  | "channels" | "criteria" | "greeting";

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
  { id: "profile",      label: "Perfil",      index: 1, checkpointIds: ["niche", "company", "name", "tone"] },
  { id: "integrations", label: "Integrações", index: 2, checkpointIds: ["channels"] },
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
  const checkpoints: WizardCheckpoint[] = [
    { id: "niche",     label: "Nicho",      done: !!ctx.niche },
    { id: "company",   label: "Empresa",    done: !!ctx.companyName },
    { id: "name",      label: "Nome",       done: !!(cfg.name && cfg.name !== "Novo Agente" && cfg.name !== "Carregando...") },
    { id: "tone",      label: "Tom de voz", done: !!cfg.toneOfVoice },
    { id: "objective", label: "Objetivo",   done: !!cfg.objective },
    { id: "channels",  label: "Canais",     done: Array.isArray(cfg.channels) && cfg.channels.length > 0 },
    { id: "criteria",  label: "Critérios",  done: !!(cfg.instructions && cfg.instructions.length > 80) },
    { id: "greeting",  label: "Saudação",   done: !!cfg.greetingMessage },
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
