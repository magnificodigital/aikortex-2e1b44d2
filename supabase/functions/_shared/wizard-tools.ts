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

  for (let iter = 0; iter < maxIterations + 1; iter++) {
    const result = await callLLM(
      messages,
      {
        tier: "free",
        toolsRequired: iter < maxIterations,
        tools: iter < maxIterations ? (WIZARD_TOOL_DEFS as unknown as any[]) : undefined,
        toolChoice: iter < maxIterations ? "auto" : undefined,
        maxTokens,
        timeoutMs: 25000,
      },
      opts.supabase,
    );

    if (!result.success) {
      console.warn(`[wizard-tools] iter=${iter} failed: ${result.error}`);
      return { content: result.content || "", toolsExecuted };
    }

    const toolCalls = (result as any).toolCalls as any[] | undefined;
    if (!toolCalls || toolCalls.length === 0) {
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
