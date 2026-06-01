// Master v7.4 §13.2 — checklist dos 4 blocos do Modo Vibe (perfil +
// integrações + critérios + fluxo), derivado do estado vivo do draft.

export interface WizardCheckpoint {
  id: "profile" | "tone" | "channels" | "criteria" | "flow";
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
    { id: "profile", label: "Perfil", done: !!(ctx.companyName && ctx.niche && cfg.name && cfg.name !== "Novo Agente") },
    { id: "tone", label: "Tom & objetivo", done: !!(cfg.toneOfVoice && cfg.objective) },
    { id: "channels", label: "Canais", done: Array.isArray(cfg.channels) && cfg.channels.length > 0 },
    { id: "criteria", label: "Critérios", done: !!(cfg.instructions && cfg.instructions.length > 80) },
    { id: "flow", label: "Saudação", done: !!cfg.greetingMessage },
  ];
  const doneCount = checkpoints.filter((c) => c.done).length;
  const totalCount = checkpoints.length;
  const pct = Math.round((doneCount / totalCount) * 100);
  return { checkpoints, doneCount, totalCount, pct };
}
