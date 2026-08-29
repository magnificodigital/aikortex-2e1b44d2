// Fonte única dos rótulos "de gente" dos tipos de agente.
// As CHAVES internas continuam técnicas (sdr, sac, custom, marketing…) —
// nunca renomear chave, só o rótulo exibido ao usuário.
// Decisão do fundador: nada de siglas técnicas na interface.

export const AGENT_TYPE_LABELS: Record<string, string> = {
  sdr: "Qualificador de Leads",
  bdr: "Prospecção Ativa",
  sac: "Suporte ao Cliente",
  cs: "Sucesso do Cliente",
  marketing: "Gestor de Conteúdos",
  custom: "Personalizado",
};

/** Retorna o rótulo amigável para um tipo de agente (aceita SDR/sdr/etc). */
export function agentTypeLabel(type?: string | null): string {
  if (!type) return "Personalizado";
  return AGENT_TYPE_LABELS[type.toLowerCase()] ?? type;
}
