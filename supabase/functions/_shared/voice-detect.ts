// Detecção de sinais de voz na descrição inicial do agente. Usado pelo
// Modo Vibe (CRIACAO) pra decidir se faz a pergunta opcional sobre voz.
//
// Sinais fortes (ligação explícita): palavras direto sobre telefonia.
// Sinais médios (intent telefônico): atividades que tipicamente envolvem
// chamada (agendar consulta, vistoria, prospecção outbound).
// Nichos onde voz é COMUM: Saúde, Imobiliária, Advocacia, Estética.

export type VoiceSignal = "strong" | "medium" | "niche" | "none";

export interface VoiceDetection {
  signal: VoiceSignal;
  reasons: string[];
  suggestedCallType: "inbound" | "outbound";
}

const STRONG_PATTERNS = [
  /\b(liga[çc][ãa]o|liga[çc][õo]es)\b/i,
  /\b(telefonema|telefonar|atende(r)?\s+(o\s+)?telefone)\b/i,
  /\b(chamada\s+telef[óo]nica|chamadas\s+telef[óo]nicas)\b/i,
  /\b(call\s+center|voicebot|voice\s+bot|tts|text\s+to\s+speech)\b/i,
  /\b(atendimento\s+telef[óo]nico|sac\s+telef[óo]nico)\b/i,
];

const MEDIUM_PATTERNS = [
  /\b(prospec[çc][ãa]o\s+outbound|cold\s+call|outbound\s+sales)\b/i,
  /\b(follow[\s-]?up\s+por\s+(telefone|voz))\b/i,
  /\b(confirma[çc][ãa]o\s+(de\s+)?consulta|confirma[çc][ãa]o\s+(de\s+)?agendamento)\b/i,
  /\b(agendamento\s+por\s+(telefone|voz))\b/i,
  /\b(cobran[çc]a\s+(por\s+)?(voz|telefone))\b/i,
];

// Nichos onde ligação é parte do operacional padrão
const NICHE_HINTS: Record<string, "inbound" | "outbound"> = {
  "Saúde": "inbound",        // confirmação de consulta, dúvidas
  "Imobiliária": "outbound", // qualificação de leads + agendamento de visita
  "Advocacia": "inbound",    // primeira consulta + dúvidas processuais
  "Estética": "inbound",     // confirmação de agendamento
  "Pet": "inbound",          // confirmação de consultas/banho
};

export function detectVoiceIntent(text: string | null | undefined, niche?: string | null): VoiceDetection {
  if (!text && !niche) return { signal: "none", reasons: [], suggestedCallType: "inbound" };
  const reasons: string[] = [];
  const t = (text ?? "").toLowerCase();

  // Strong: ligação/telefonema/voz/chamada explícita
  let strongMatched = false;
  for (const re of STRONG_PATTERNS) {
    const m = t.match(re);
    if (m) {
      strongMatched = true;
      reasons.push(`menção direta: "${m[0]}"`);
    }
  }
  if (strongMatched) {
    // Detecta direção: outbound se houver "prospec/cold/saída"; default inbound
    const isOutbound = /\b(prospec|cold|outbound|sa[íi]da|ativo)\b/i.test(t);
    return {
      signal: "strong",
      reasons,
      suggestedCallType: isOutbound ? "outbound" : "inbound",
    };
  }

  // Medium: intent telefônico via verbos típicos
  let mediumMatched = false;
  for (const re of MEDIUM_PATTERNS) {
    const m = t.match(re);
    if (m) {
      mediumMatched = true;
      reasons.push(`atividade telefônica típica: "${m[0]}"`);
    }
  }
  if (mediumMatched) {
    const isOutbound = /\b(prospec|cold|outbound|cobran|follow)\b/i.test(t);
    return {
      signal: "medium",
      reasons,
      suggestedCallType: isOutbound ? "outbound" : "inbound",
    };
  }

  // Niche-based: nicho onde voz é padrão de mercado
  if (niche && NICHE_HINTS[niche]) {
    return {
      signal: "niche",
      reasons: [`nicho "${niche}" tipicamente usa voz`],
      suggestedCallType: NICHE_HINTS[niche],
    };
  }

  return { signal: "none", reasons: [], suggestedCallType: "inbound" };
}
