// Classificador de outcome — recebe transcript + lista de tags candidatas
// (tracked_outcomes do agente) e retorna quais aplicam.
//
// Usado no final de chamadas (telnyx-webhook hangup) pra popular
// call_logs.outcome_tags, e depois Spark consegue responder
// "quantas qualificacoes hoje?" via spark-tools.count_outcomes.
//
// LLM usado: cascata padrao do callLLM (OpenRouter platform key). Classificacao
// e' tarefa pequena (256 tokens), modelo free serve. Se falhar (sem chave,
// transcript vazio, etc), retorna [] e nao bloqueia — outcome tagging e'
// melhor-esforco, nunca quebra a chamada.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callLLM, type LLMMessage } from "./llm-fallback.ts";

export interface ClassifyOutcomeInput {
  /** Lista de tags candidatas — vem de user_agents.config.tracked_outcomes. */
  trackedOutcomes: string[];
  /** Texto da conversa — pra calls, concatenar transcript. */
  transcript: string;
  /** Tipo do agente (SDR, SAC, CS, BDR, Custom) — ajuda o LLM contextualizar. */
  agentType?: string;
  /** Duracao em segundos (opcional, ajuda classificar no_show / unresponsive). */
  durationSeconds?: number;
}

const SYSTEM_PROMPT = `Você classifica resultados de conversas/chamadas de agentes IA.
Receba: tipo do agente, lista de outcomes possíveis e transcript.
Retorne APENAS um JSON array com os outcomes que se aplicam — pode ser zero, um ou vários.
Use SOMENTE os outcomes da lista fornecida. Não invente novos.
Exemplo de retorno: ["qualified", "meeting_booked"]
Se nada se aplica, retorne: []
NUNCA retorne texto fora do array JSON.`;

/** Classifica outcomes via LLM. Retorna array (possivelmente vazio). */
export async function classifyOutcome(
  supabase: SupabaseClient,
  input: ClassifyOutcomeInput,
): Promise<string[]> {
  const tracked = (input.trackedOutcomes ?? []).filter(Boolean);
  if (tracked.length === 0) return [];
  const transcript = (input.transcript ?? "").trim();
  if (!transcript) return [];

  const userPrompt = [
    `Agente: ${input.agentType ?? "Custom"}`,
    typeof input.durationSeconds === "number"
      ? `Duração: ${input.durationSeconds}s`
      : "",
    `Outcomes possíveis: ${JSON.stringify(tracked)}`,
    "",
    "Transcript:",
    transcript.slice(0, 8000),
    "",
    "Retorne SÓ o JSON array dos outcomes que se aplicam.",
  ]
    .filter(Boolean)
    .join("\n");

  const messages: LLMMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  try {
    const result = await callLLM(
      messages,
      { tier: "free", maxTokens: 256, temperature: 0 },
      supabase,
    );
    if (!result.success || !result.content) return [];
    return parseTags(result.content, tracked);
  } catch (e) {
    console.error("[classify-outcome] LLM call failed:", e);
    return [];
  }
}

/** Parse robusto — LLM pode mandar com markdown, prefixo, etc. */
function parseTags(raw: string, allowed: string[]): string[] {
  const trimmed = raw.trim();
  // Extrai primeiro array JSON encontrado no texto
  const match = trimmed.match(/\[[\s\S]*?\]/);
  if (!match) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const allowSet = new Set(allowed);
  const out: string[] = [];
  for (const item of parsed) {
    if (typeof item !== "string") continue;
    const tag = item.trim();
    if (allowSet.has(tag) && !out.includes(tag)) out.push(tag);
  }
  return out;
}
