// Tools que o Modo Vibe (Master v7.4 §13.2 + §13.16) usa pra MUTAR o draft
// do agente em tempo real, em vez de só perguntar e gerar JSON no final.
//
// Padrão: cada tool aqui é uma chamada de função pra `agent-vibe-mutate`
// edge function, que aplica a mudança no `user_agents` + tabelas relacionadas.

import { callLLM } from "./llm-fallback.ts";

export const WIZARD_TOOL_DEFS = [
  {
    type: "function",
    function: {
      name: "set_agent_name",
      description: "Define ou atualiza o nome do agente (ex: 'Sofia', 'Henrique'). USE quando o usuário sugerir/confirmar um nome.",
      parameters: {
        type: "object",
        properties: { name: { type: "string", description: "Nome do agente" } },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_agent_description",
      description: "Define a descrição em 1-2 frases do que o agente faz. Exemplo: 'Agente SDR especializado em clínicas odontológicas que qualifica leads via WhatsApp e agenda consultas no Google Agenda.'",
      parameters: {
        type: "object",
        properties: { description: { type: "string", description: "Descrição clara em 1-2 frases" } },
        required: ["description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_agent_type",
      description: "Categoriza o tipo do agente (Master v7.4). VALUES: SDR (qualificação inbound de leads), BDR (prospecção outbound), SAC (atendimento ao cliente), CS (Customer Success/pós-venda), Custom (genérico). Decida com base na descrição do usuário.",
      parameters: {
        type: "object",
        properties: {
          agent_type: { type: "string", enum: ["SDR", "BDR", "SAC", "CS", "Custom"], description: "Tipo do agente" },
        },
        required: ["agent_type"],
      },
    },
  },
  // set_avatar removida do wizard — avatar padrão é o ícone Aikortex.
  // User troca depois via painel (Identidade → Avatar → Enviar foto).
  {
    type: "function",
    function: {
      name: "set_company_name",
      description: "Define o nome da empresa que o agente representa. USE assim que o usuário mencionar o nome do negócio dele.",
      parameters: {
        type: "object",
        properties: { companyName: { type: "string" } },
        required: ["companyName"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_niche",
      description: "Define o nicho de atuação (Master v7.4 §15.2): Saúde, Imobiliária, Advocacia, Food/Restaurante, Educação, Automotivo, Finanças, Retail, SaaS, Seguros, Estética, Pet. USE assim que descobrir o setor da agência.",
      parameters: {
        type: "object",
        properties: { niche: { type: "string" } },
        required: ["niche"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_tone_of_voice",
      description: "Define o tom de voz do agente (ex: 'profissional e consultivo', 'casual e amigável', 'empático').",
      parameters: {
        type: "object",
        properties: { tone: { type: "string" } },
        required: ["tone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_objective",
      description: "Define o objetivo principal do agente em 1-2 frases (ex: 'Qualificar leads via WhatsApp e agendar consultas com a clínica').",
      parameters: {
        type: "object",
        properties: { objective: { type: "string" } },
        required: ["objective"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_instructions",
      description: "Define as instruções operacionais detalhadas do agente. Use markdown estruturado (## Tom, ## Fluxo, ## Critérios, etc). DEVE ser construído incrementalmente conforme a entrevista avança — chame esta tool a cada novo bloco descoberto, acumulando o conteúdo anterior.",
      parameters: {
        type: "object",
        properties: { instructions: { type: "string", description: "Texto completo das instruções, em markdown." } },
        required: ["instructions"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_greeting_message",
      description: "Define a mensagem de saudação inicial que o agente usa ao iniciar conversa.",
      parameters: {
        type: "object",
        properties: { message: { type: "string" } },
        required: ["message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_capability",
      description: "Liga/desliga uma capacidade do agente. Chaves válidas: planning, reasoning, code_runtime, memory, auto_integration.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", enum: ["planning", "reasoning", "code_runtime", "memory", "auto_integration"] },
          enabled: { type: "boolean" },
        },
        required: ["key", "enabled"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_channel",
      description: "Liga/desliga um canal de comunicação do agente. Canais válidos: email, whatsapp, voice, sms, instagram, facebook, telegram, tiktok, linkedin, website.",
      parameters: {
        type: "object",
        properties: {
          channel: { type: "string" },
          enabled: { type: "boolean" },
        },
        required: ["channel", "enabled"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_tool",
      description: "Habilita uma ferramenta runtime do agente. Tools válidas: web_search, image_gen, knowledge_search, table_read, table_write. USE quando user pedir capacidade que requer uma tool (ex: 'pesquisar empresas' → web_search).",
      parameters: {
        type: "object",
        properties: {
          tool_key: { type: "string", enum: ["web_search", "image_gen", "knowledge_search", "table_read", "table_write"] },
        },
        required: ["tool_key"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "request_external_integration",
      description: "Marca que o agente vai precisar de uma integração externa (Google Calendar, HubSpot, etc.). USE quando o user mencionar ferramentas tipo 'Google Agenda', 'meu CRM HubSpot', 'planilhas do Google', etc. Integrações válidas: google_calendar, outlook_calendar, calendly, google_sheets, google_drive, gmail, hubspot, piperun, rd_station. Resposta inclui se a integração já está conectada na agência ou se precisa configurar.",
      parameters: {
        type: "object",
        properties: {
          integration_key: {
            type: "string",
            enum: ["google_calendar", "outlook_calendar", "calendly", "google_sheets", "google_drive", "gmail", "hubspot", "piperun", "rd_station"],
            description: "Chave da integração externa.",
          },
        },
        required: ["integration_key"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "commit_draft",
      description: "Marca o wizard como concluído. CHAME esta tool no final, depois de cobrir os 4 elementos do §13.2 (perfil + integrações + critérios + fluxo) e confirmar com o usuário.",
      parameters: { type: "object", properties: {} },
    },
  },
] as const;

interface RunWizardWithToolsOptions {
  supabase: any;
  agentId: string;
  agencyId: string | null;
  messages: Array<{ role: string; content: string | null; tool_calls?: any; tool_call_id?: string; name?: string }>;
  maxTokens?: number;
  maxIterations?: number;
  userJwt?: string | null;
}

/** Parser de narrativa: detecta padrões tipo "Anotei a saudação 'X'"
 *  e devolve calls inferidas. Safety net pro LLM que narra sem chamar
 *  tool — frontend ficava com checklist vazio mesmo agente "configurado". */
interface InferredCall { name: string; params: Record<string, any> }

function inferToolsFromNarrative(content: string, already: Set<string>): InferredCall[] {
  if (!content) return [];
  const calls: InferredCall[] = [];
  // Aceita aspas curvas ou retas em volta dos valores capturados
  const Q = `["“”'']`;

  // set_greeting_message
  const greetingPats = [
    new RegExp(`mensagem\\s+de\\s+saudação\\s+configurada\\s+como\\s+${Q}([^"”'']+)${Q}`, "i"),
    new RegExp(`(?:anotei|defini|configurei)\\s+(?:a\\s+)?saudação[^"]*${Q}([^"”'']+)${Q}`, "i"),
    new RegExp(`saudação\\s+(?:inicial\\s+)?(?:configurada|definida)(?:\\s+como)?\\s+${Q}([^"”'']+)${Q}`, "i"),
  ];
  if (!already.has("set_greeting_message")) {
    for (const p of greetingPats) {
      const m = content.match(p);
      if (m) { calls.push({ name: "set_greeting_message", params: { message: m[1].trim() } }); break; }
    }
  }

  // set_instructions
  const instructionsPats = [
    new RegExp(`(?:anotei|registrei|configurei)\\s+(?:a\\s+|as\\s+)?(?:instrução|instruções|critério|critérios)[^"]*${Q}([^"”'']{15,})${Q}`, "i"),
  ];
  if (!already.has("set_instructions")) {
    for (const p of instructionsPats) {
      const m = content.match(p);
      if (m) { calls.push({ name: "set_instructions", params: { instructions: m[1].trim() } }); break; }
    }
  }

  // set_agent_name
  const namePats = [
    /(?:nome\s+do\s+agente\s+(?:anotado|definido|configurado)\s+como\s+)([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+)/,
    /([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÀ-ÿ]+)\s+anotad[ao]\s+como\s+(?:o\s+)?nome\s+do\s+agente/,
  ];
  if (!already.has("set_agent_name")) {
    for (const p of namePats) {
      const m = content.match(p);
      if (m) { calls.push({ name: "set_agent_name", params: { name: m[1].trim() } }); break; }
    }
  }

  // set_tone_of_voice
  const tonePats = [
    new RegExp(`marquei\\s+(?:o\\s+)?tom\\s+(?:de\\s+(?:voz|comunicação)\\s+)?como\\s+${Q}?([\\wÀ-ÿ\\s]+?)${Q}?(?:[.!]|$)`, "i"),
    new RegExp(`tom\\s+(?:de\\s+(?:voz|comunicação)\\s+)?(?:anotado|definido|configurado)\\s+como\\s+${Q}?([\\wÀ-ÿ\\s]+?)${Q}?(?:[.!]|$)`, "i"),
    /tom\s+de\s+(?:voz|comunicação)\s*:\s*([\wÀ-ÿ\s]+?)(?:[.!\n]|$)/i,
  ];
  if (!already.has("set_tone_of_voice")) {
    for (const p of tonePats) {
      const m = content.match(p);
      if (m && m[1].trim().length > 2 && m[1].trim().length < 60) {
        calls.push({ name: "set_tone_of_voice", params: { tone: m[1].trim() } });
        break;
      }
    }
  }

  // set_objective
  const objectivePats = [
    new RegExp(`(?:objetivo|propósito)\\s+(?:do\\s+agente\\s+)?(?:anotado|definido|configurado|marcado)\\s+(?:como\\s+)?${Q}([^"”'']{15,})${Q}`, "i"),
    new RegExp(`(?:marquei|defini)\\s+(?:o\\s+)?objetivo\\s+(?:como\\s+|principal\\s+como\\s+)?${Q}([^"”'']{15,})${Q}`, "i"),
  ];
  if (!already.has("set_objective")) {
    for (const p of objectivePats) {
      const m = content.match(p);
      if (m) { calls.push({ name: "set_objective", params: { objective: m[1].trim() } }); break; }
    }
  }

  // set_company_name
  const companyPats = [
    new RegExp(`(?:empresa|negócio|clínica|escritório|loja)\\s+(?:anotad[ao]|configurad[ao]|definid[ao])\\s+como\\s+${Q}?([\\wÀ-ÿ\\s&-]+?)${Q}?(?:[.!]|$)`, "i"),
    new RegExp(`marquei\\s+(?:a\\s+)?(?:empresa|negócio)\\s+como\\s+${Q}?([\\wÀ-ÿ\\s&-]+?)${Q}?(?:[.!]|$)`, "i"),
  ];
  if (!already.has("set_company_name")) {
    for (const p of companyPats) {
      const m = content.match(p);
      if (m && m[1].trim().length > 1 && m[1].trim().length < 80) {
        calls.push({ name: "set_company_name", params: { companyName: m[1].trim() } });
        break;
      }
    }
  }

  // set_channel — varre toda a string buscando canais conhecidos em narrativa
  // "Marquei WhatsApp e Instagram como canais"
  const channelKnown = ["whatsapp", "email", "instagram", "facebook", "telegram", "sms", "website", "tiktok", "linkedin", "voice"];
  const channelClaim = /(?:marquei|habilitei|ativei|liguei|adicionei)\s+([^.!?]*?)(?:\s+como\s+canai?s?|\s+como\s+canal|\s+nos?\s+canai?s?)/i.test(content);
  if (channelClaim) {
    for (const ch of channelKnown) {
      // Match palavra inteira; case-insensitive
      const re = new RegExp(`\\b${ch}\\b`, "i");
      if (re.test(content)) {
        calls.push({ name: "set_channel", params: { channel: ch, enabled: true } });
      }
    }
  }

  // commit_draft — quando bot anuncia que agente foi "criado com sucesso"
  if (!already.has("commit_draft") && /agente\s+\w+\s+foi\s+criado\s+com\s+sucesso|wizard\s+conclu[íi]do|montei\s+a\s+primeira\s+versão.*concluído/i.test(content)) {
    calls.push({ name: "commit_draft", params: {} });
  }

  return calls;
}

/** Executa loop de tool-calling no Modo Vibe. Cada tool call invoca
 *  agent-vibe-mutate via HTTP pra aplicar a mudança no draft. */
export async function runWizardWithTools(opts: RunWizardWithToolsOptions): Promise<{
  content: string;
  toolsExecuted: Array<{ name: string; log: string }>;
}> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const maxIterations = opts.maxIterations ?? 5;
  const maxTokens = opts.maxTokens ?? 1500;
  const toolsExecuted: Array<{ name: string; log: string }> = [];

  const messages = [...opts.messages];

  // Helper: fire tool via agent-vibe-mutate; updates toolsExecuted.
  const fireTool = async (name: string, params: Record<string, any>): Promise<string> => {
    try {
      const resp = await fetch(`${supabaseUrl}/functions/v1/agent-vibe-mutate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${opts.userJwt ?? serviceKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: opts.agentId, action: name, params }),
      });
      const json = await resp.json();
      if (resp.ok) {
        const log = json.log || `${name} aplicado`;
        toolsExecuted.push({ name, log });
        console.log(`[wizard-tools] ⚡ inferred ${name}: ${log}`);
        return log;
      }
      console.warn(`[wizard-tools] ⚡ inferred ${name} failed: ${json.error}`);
    } catch (e) {
      console.error(`[wizard-tools] ⚡ inferred ${name} exception:`, e);
    }
    return "";
  };

  // Roda parser ANTES de retornar: se LLM narrou sem chamar tool, força.
  const flushInferredTools = async (content: string): Promise<void> => {
    const already = new Set(toolsExecuted.map((t) => t.name));
    const inferred = inferToolsFromNarrative(content, already);
    for (const call of inferred) {
      await fireTool(call.name, call.params);
    }
  };

  for (let iter = 0; iter < maxIterations + 1; iter++) {
    const result = await callLLM(
      messages,
      {
        tier: "free",
        toolsRequired: iter < maxIterations,
        tools: iter < maxIterations ? (WIZARD_TOOL_DEFS as unknown as any[]) : undefined,
        toolChoice: iter < maxIterations ? "auto" : undefined,
        maxTokens,
        // Bumped from 25s → 45s pra acomodar one-shot com 10+ tool calls
        timeoutMs: 45000,
      },
      opts.supabase,
    );

    if (!result.success) {
      console.warn(`[wizard-tools] iter=${iter} failed: ${result.error}`);
      await flushInferredTools(result.content || "");
      return { content: result.content || "", toolsExecuted };
    }

    const toolCalls = (result as any).toolCalls as any[] | undefined;
    if (!toolCalls || toolCalls.length === 0) {
      await flushInferredTools(result.content || "");
      return { content: result.content || "", toolsExecuted };
    }

    // Append assistant turn com tool_calls
    messages.push({
      role: "assistant",
      content: result.content ?? null,
      tool_calls: toolCalls,
    } as any);

    for (const tc of toolCalls) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc.function?.arguments || "{}"); } catch { /* ignore */ }

      const name = String(tc.function?.name || "");
      let toolResult = "";
      let log = "";

      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/agent-vibe-mutate`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${opts.userJwt ?? serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agentId: opts.agentId,
            action: name,
            params: args,
          }),
        });
        const json = await resp.json();
        if (resp.ok) {
          log = json.log || `${name} aplicado`;
          toolResult = JSON.stringify({ ok: true, log });
          toolsExecuted.push({ name, log });
          console.log(`[wizard-tools] ✓ ${name}: ${log}`);
        } else {
          toolResult = JSON.stringify({ ok: false, error: json.error, details: json.message });
          console.warn(`[wizard-tools] ✗ ${name}: ${json.error}`);
        }
      } catch (e) {
        toolResult = JSON.stringify({ ok: false, error: "FETCH_EXCEPTION", message: String(e) });
        console.error(`[wizard-tools] exception in ${name}:`, e);
      }

      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        name,
        content: toolResult,
      } as any);
    }
  }

  return { content: "", toolsExecuted };
}
