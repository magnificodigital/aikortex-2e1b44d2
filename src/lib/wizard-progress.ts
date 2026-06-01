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

export function computeWizardProgress(savedConfig: Record<string, any> | null | undefined): {
  checkpoints: WizardCheckpoint[];
  doneCount: number;
  totalCount: number;
  pct: number;
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
  return { checkpoints, doneCount, totalCount, pct };
}
