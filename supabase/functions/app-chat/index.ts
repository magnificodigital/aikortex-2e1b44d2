import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuthContext as getSharedAuthContext, handleCors, corsHeaders } from "../_shared/auth.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { applyCapabilityAddons } from "../_shared/agent-runtime.ts";
import { runAgentLLM } from "../_shared/agent-tools.ts";
import { callLLM, buildAdminClient } from "../_shared/llm-fallback.ts";
import { runWizardWithTools } from "../_shared/wizard-tools.ts";

function streamText(text: string): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(ctrl) {
      const words = text.split(" ");
      for (let i = 0; i < words.length; i++) {
        const chunk = i === words.length - 1 ? words[i] : words[i] + " ";
        ctrl.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`));
      }
      ctrl.enqueue(encoder.encode("data: [DONE]\n\n"));
      ctrl.close();
    },
  });
}

// Buffered LLM call — replaces both bufferFromOpenRouterPlatform and the
// stream variant. Streaming has been replaced by buffer+restream pattern
// (already standardized) to eliminate empty stream bugs.
async function bufferFromPlatform(
  messages: Array<{ role: string; content: string }>,
  preferredModel?: string,
  supabase?: ReturnType<typeof createClient>,
): Promise<string> {
  const result = await callLLM(messages, {
    tier: "free",
    preferredModel,
    maxTokens: 2048,
    timeoutMs: 12000,
  }, supabase);
  if (!result.success) {
    console.error("[app-chat] all models failed:", result.error);
    return "";
  }
  return result.content || "";
}

function buildAgentSystemPrompt(agentConfig: Record<string, unknown>): string {
  const name = String(agentConfig?.name || "Assistente");
  const role = String(agentConfig?.role || "").toLowerCase();
  const objective = String(agentConfig?.objective || "");
  const instructions = String(agentConfig?.instructions || "");
  const tone = String(agentConfig?.toneOfVoice || "Profissional e Amigável");
  const company = String(agentConfig?.companyName || "");
  const isSdr = role.includes("sdr") || role.includes("vendas") || role.includes("sales") ||
    objective.toLowerCase().includes("qualific") || instructions.toLowerCase().includes("bant");
  const base = isSdr
    ? `Você é ${name}, agente SDR${company ? ` da ${company}` : ""}.
Objetivo: ${objective || "Qualificar leads e agendar reuniões."}
Tom: ${tone}
Instruções: ${instructions}
Regras: faça UMA pergunta por vez. Colete nome, email, telefone, empresa, cargo. Qualifique com BANT. Responda em português do Brasil.`
    : `Você é ${name}${company ? ` da ${company}` : ""}.
Objetivo: ${objective}
Tom: ${tone}
Instruções: ${instructions}
Responda em português do Brasil.`;
  return applyCapabilityAddons(base, (agentConfig as any)?.capabilities);
}

// Nichos prioritários do Master v7.4 §15.2 (lançamento) — adapta linguagem,
// exemplos e ordem de perguntas conforme o setor brasileiro escolhido.
const NICHES_AIKORTEX = [
  "Saúde", "Imobiliária", "Advocacia", "Food/Restaurante", "Educação",
  "Automotivo", "Finanças", "Retail", "SaaS", "Seguros", "Estética", "Pet",
];

// Foco por tipo conforme Master v7.4 §13.4 (5 tipos válidos)
const AGENT_TYPE_FOCUS: Record<string, string> = {
  SDR: "qualificar leads inbound e marcar reuniões com o time comercial",
  BDR: "prospectar leads outbound e gerar oportunidades novas",
  SAC: "atender clientes, resolver dúvidas e suporte de pós-venda",
  CS: "garantir sucesso do cliente, follow-ups e retenção",
  Custom: "objetivo customizado a ser descoberto na entrevista",
};

/**
 * Wizard de criação de agente — Modo Vibe (Master v7.4 §13.2 + §13.4).
 *
 * Conduz entrevista conversacional pra cobrir 4 elementos do §13.2:
 *   1. Identificar perfil (nome, persona, tom, objetivo)
 *   2. Mapear integrações necessárias (calendário, CRM, KB)
 *   3. Definir critérios de qualificação/atendimento
 *   4. Estruturar fluxo de conversa (etapas)
 *
 * Sempre contextualizado por nicho (§13.4 + §15.2). Quando nicho não vem,
 * primeira pergunta identifica o nicho.
 */
function buildWizardSystemPrompt(agentType: string, niche?: string): string {
  const normalizedType = ["SDR", "BDR", "SAC", "CS"].includes(agentType.toUpperCase())
    ? agentType.toUpperCase()
    : "Custom";
  const focus = AGENT_TYPE_FOCUS[normalizedType] || AGENT_TYPE_FOCUS.Custom;

  const nicheContext = niche
    ? `O agente vai operar no nicho de **${niche}**. Adapte exemplos, terminologia, integrações sugeridas e ordem de perguntas ao contexto brasileiro desse setor (regulamentações, jargão, sazonalidade, dor real).`
    : `Nenhum nicho foi definido ainda. SUA PRIMEIRA PERGUNTA deve identificar o nicho. Sugira entre: ${NICHES_AIKORTEX.join(", ")}. Assim que o usuário disser, CHAME a tool set_niche imediatamente.`;

  return `Você é o construtor conversacional de agentes do Aikortex (Modo Vibe — Master v7.4 §13.2 + §13.16).

VOCÊ NÃO É UM ENTREVISTADOR PASSIVO. Você AGE: a cada informação que o usuário fornece, você IMEDIATAMENTE chama a tool correspondente pra mutar o draft do agente. O painel à direita reflete suas ações em tempo real — o usuário VÊ o agente sendo construído.

Tipo do agente: **${normalizedType}** — foco em ${focus}.
${nicheContext}

# COMO VOCÊ AGE — REGRA DE OURO

Cada turn deve seguir o padrão:
1. **Faça UMA pergunta** curta e focada (1-2 frases).
2. **Quando receber resposta**, CHAME a(s) tool(s) apropriada(s) ANTES de responder em texto.
3. **Resposta em texto** = confirmação curta do que aplicou + próxima pergunta.

Exemplos de comportamento esperado:

Usuário: "Quero um SDR pra clínica odontológica"
→ Chama: set_niche({niche:"Saúde"}), set_company_name (se mencionar empresa), set_objective({objective:"Qualificar leads inbound e agendar consultas pra clínica odontológica"})
→ Resposta: "Anotado, marquei Saúde como nicho. Como podemos chamar esse agente?"

Usuário: "Sofia"
→ Chama: set_agent_name({name:"Sofia"})
→ Resposta: "Sofia anotada. Qual o tom de comunicação ideal? Mais consultivo, casual ou direto?"

Usuário: "Quero que ele agende consultas no Google Agenda"
→ Chama: set_channel({channel:"whatsapp",enabled:true}), add_tool({tool_key:"table_write"}) — ou outras tools relevantes
→ Resposta: "Habilitei WhatsApp e a integração de agendamento. Pra criar consultas, vou precisar saber: você tem uma planilha/tabela de pacientes ou Google Sheets?"

# TOOLS DISPONÍVEIS

Você tem 11 tools que mutam o draft em tempo real:
- set_agent_name, set_company_name, set_niche, set_tone_of_voice
- set_objective, set_instructions, set_greeting_message
- set_capability, set_channel, add_tool
- commit_draft (chame por último quando concluir)

# ROTEIRO DA ENTREVISTA (Master §13.2 — cobrir os 4 blocos)

1. **Perfil do agente** → set_agent_name, set_company_name, set_tone_of_voice, set_objective
2. **Integrações** → set_channel (canais), add_tool (capacidades de execução)
3. **Critérios** → set_instructions (acumula incrementalmente)
4. **Fluxo de conversa** → set_greeting_message + complementa set_instructions

QUANDO TIVER COBERTO OS 4 BLOCOS, faça uma confirmação curta tipo: "Pronto, montei a primeira versão. Vou marcar como concluído?" Aguarda OK e CHAMA commit_draft.

# REGRAS

- Tom natural, brasileiro, direto. Máximo 2 frases por mensagem (não conta tools).
- Use exemplos do nicho: clínica→consulta/paciente; imobiliária→visita/lead; food→reserva/cliente.
- Pushback educado se pedido violar boas práticas (LGPD, sem opt-out, agressividade).
- SEMPRE prefira chamar a tool em vez de só "anotar mentalmente".
- Se já chamou uma tool e o usuário corrigir, chame ela DE NOVO com o valor correto.
- NÃO gere JSON na resposta de texto — tools fazem isso.

# RESPONDA A WARNINGS DAS TOOLS

Quando uma tool retornar com warning (ex: \`{ ok: true, warning: "Email marcado como canal, mas Resend não conectado..." }\`), você DEVE incluir essa informação na sua próxima resposta ao usuário — não esconda. Exemplo:

Tool retornou: \`{ok:true, log:"Canal whatsapp: ativado", warning:"WhatsApp marcado mas Meta API não conectada..."}\`
Sua resposta: "Marquei WhatsApp como canal do agente. ⚠️ Notei que sua conta WhatsApp Business ainda não está conectada — sem isso o agente não vai conseguir mandar mensagens reais. Quer conectar agora em Configurações → Canais → WhatsApp, ou continuamos a configuração e você conecta depois?"

Seja transparente: warnings são informação operacional que o usuário precisa saber pra não ter surpresas depois.`;
}

/* ── Structuring prompt ── */

function buildStructuringPrompt(appType: string, language: string, niche?: string) {
  if (appType === "agent") {
    const nicheBlock = niche
      ? `\nNICHO: ${niche}\nContextualize TODOS os campos pro setor (terminologia BR, exemplos reais do nicho, integrações típicas, etapas plausíveis). Não use placeholders genéricos.\n`
      : "";

    return `Você é um arquiteto especializado em agentes de IA conversacionais (Aikortex Master v7.4 §13.2).

Sua ÚNICA tarefa é analisar a descrição/entrevista do usuário e retornar um JSON estruturado que define completamente o agente a ser construído.
${nicheBlock}
REGRAS:
- Retorne APENAS um bloco JSON válido, sem texto antes ou depois
- Infira o máximo possível: nome, tipo, tom, objetivo, instruções, mensagem de saudação, etapas
- Se algo não foi mencionado, use valores padrão inteligentes (não placeholders óbvios)
- Tipos permitidos (Master §13.4): SDR, BDR, SAC, CS, Custom
- Idioma fixo: ${language}

O JSON deve seguir EXATAMENTE este formato:

{
  "agent_name": "Nome do Agente",
  "agent_type": "SDR",
  "description": "Descrição completa do agente e seu papel",
  "objective": "Objetivo principal do agente",
  "tone": "professional_friendly",
  "language": "${language}",
  "greeting_message": "Mensagem de saudação natural e contextual",
  "instructions": "Instruções detalhadas de comportamento",
  "quick_replies": ["Opção 1", "Opção 2", "Opção 3"],
  "stages": [
    {"id": "s1", "name": "Saudação", "description": "Apresentar o agente", "example": "Olá! Como posso ajudar?"},
    {"id": "s2", "name": "Entendimento", "description": "Compreender a necessidade", "example": "Me conte mais sobre o que precisa."}
  ]
}

Valores válidos para "tone": "professional_friendly", "formal", "casual", "empathetic", "direct"
Valores válidos para "agent_type": "SDR", "BDR", "SAC", "CS", "Custom"
Valores válidos para "language": "pt-BR", "en", "es"

Retorne SOMENTE o JSON.`;
  }

  return `Você é um arquiteto de produto especializado em apps para ${appType === "whatsapp" ? "WhatsApp" : "Web"}.

Sua ÚNICA tarefa é analisar a descrição do usuário e retornar um JSON estruturado que define completamente o app a ser construído.

REGRAS:
- Retorne APENAS um bloco JSON válido, sem texto antes ou depois
- Infira o máximo possível da descrição: nome, funcionalidades, tom, mensagem inicial
- Se algo não for mencionado, use valores padrão inteligentes

O JSON deve seguir EXATAMENTE este formato:

{
  "app_type": "${appType}",
  "app_name": "Nome do App",
  "app_description": "Descrição completa e detalhada",
  "tone": "professional_friendly",
  "language": "${language}",
  "intro_message": "Mensagem de boas-vindas contextual e natural, como uma conversa real",
  "max_turn_messages": 2,
  "onboarding_level": "soft",
  "selected_features": ["feature1", "feature2", "feature3"],
  "business_context": "Contexto de negócio inferido",
  "constraints": "Restrições identificadas ou padrão"
}

Valores válidos para "tone": "professional_friendly", "formal", "casual", "empathetic", "direct"
Valores válidos para "onboarding_level": "none", "soft", "strict"
Valores válidos para "language": "pt-BR", "en", "es"

Retorne SOMENTE o JSON.`;
}

/* ── Runtime App State prompt ── */

function buildAppStatePrompt(ctx?: Record<string, string>) {
  const appType = ctx?.app_type || "web";
  const appName = ctx?.app_name || "Meu App";
  const appDesc = ctx?.app_description || "";
  const tone = ctx?.tone || "professional_friendly";
  const language = ctx?.language || "pt-BR";
  const introMessage = ctx?.intro_message || "";
  const maxMessages = ctx?.max_turn_messages || "2";
  const onboarding = ctx?.onboarding_level || "soft";
  const features = ctx?.selected_features || "";
  const bizContext = ctx?.business_context || "";
  const constraints = ctx?.constraints || "";
  const isPatch = ctx?.is_patch === "true";
  const currentState = ctx?.current_state || "";

  const isWhatsApp = appType === "whatsapp";

  return `Você é o motor de geração do Aikortex Studio. Sua função é gerar um estado de aplicação renderizável.

# CONTEXTO ATIVO
- Tipo: ${isWhatsApp ? "WhatsApp App" : "Web App"}
- Nome: ${appName}
- Descrição: ${appDesc}
- Tom de voz: ${tone}
- Idioma: ${language}
- Mensagem inicial: ${introMessage}
- Máx. msgs/turno: ${maxMessages}
- Onboarding: ${onboarding}
${features ? `- Funcionalidades: ${features}` : ""}
${bizContext ? `- Contexto: ${bizContext}` : ""}
${constraints ? `- Restrições: ${constraints}` : ""}

# REGRA ABSOLUTA
Retorne APENAS JSON válido. NENHUM texto fora do JSON. Sem markdown, sem explicações, sem "Aqui está".

# FORMATO OBRIGATÓRIO

{
  "app_state": {
    "app_meta": {
      "type": "${appType}",
      "name": "",
      "description": "",
      "tone": "${tone}",
      "language": "${language}",
      "status": "draft"
    },
    "preview": {
      "type": "${appType}",
      "title": "",
      "subtitle": "",
      "layout": {},
      "screen_data": {},
      "interactions": []
    },
    "agent_config": {
      "intro_message": "",
      "max_turn_messages": ${maxMessages},
      "onboarding_level": "${onboarding}",
      "personality_rules": [],
      "conversation_rules": [],
      "cta_primary": "",
      "quick_replies": []
    },
    "flows": [],
    "database": { "tables": [] },
    "files": [],
    "ui_modules": [],
    "runtime": {
      "render_ready": true,
      "mocked": true,
      "warnings": [],
      "next_build_targets": []
    }
  },
  "chat_summary": ""
}

# REGRAS CRÍTICAS POR CAMPO

## preview.screen_data
${isWhatsApp ? `Para WhatsApp Apps, DEVE conter:
- "bot_name": nome do bot (texto limpo, humanizado)
- "bot_status": "online"
- "greeting": mensagem de boas-vindas CONVERSACIONAL e natural (como um humano falaria no WhatsApp, NÃO como um sistema)
- "quick_replies": array de 2-4 botões de resposta rápida com TEXTO LIMPO (ex: "Agendar consulta", "Ver preços"). NUNCA use snake_case, underscores ou nomes técnicos.
- "conversation_flow": array de objetos {"trigger": "palavra-chave", "response": "resposta natural do bot", "suggestions": ["opção1", "opção2"]}
  - As respostas devem ser CONVERSACIONAIS, como uma pessoa falaria no WhatsApp
  - Cada trigger deve ter uma resposta que AVANÇA a conversa (faz perguntas, coleta dados, oferece opções)
  - Mínimo 5 conversation_flow entries cobrindo as features principais
- "stages": array de etapas da jornada do usuário (ex: ["Boas-vindas", "Coleta de dados", "Confirmação"])
- "input_placeholder": texto do placeholder do input (ex: "Digite sua mensagem...")

REGRA DE LINGUAGEM: Todas as mensagens, quick_replies e responses devem ser escritas como uma CONVERSA REAL de WhatsApp. Sem termos técnicos, sem underscores, sem snake_case. Use emojis com moderação. Fale como um profissional amigável falaria.` : `Para Web Apps, DEVE conter:
- "nav_items": array de {"label": "Nome da página", "icon": "nome-do-icone"}
- "metrics": array de {"label": "Métrica", "value": "123", "change": "+12%"}
- "active_page": nome da página ativa
- "page_title": título da seção principal
- "table_data": {"name": "tabela", "columns": ["col1", "col2"], "sample_rows": 3} quando relevante
- "chart_data": {"title": "Título do gráfico", "type": "bar|line|pie"} quando relevante`}

## agent_config
- quick_replies: TEXTO LIMPO e HUMANIZADO. Nunca "plano_alimentar", sempre "Plano alimentar" ou "Ver meu plano".
- personality_rules e conversation_rules: regras claras e contextuais

## flows
- Pelo menos 1 fluxo principal para WhatsApp Apps
- Cada step: {"id": "step_1", "type": "message|input|action", "action": "descrição", "description": "detalhe"}

## database.tables
- Apenas tabelas relevantes ao produto
- Cada coluna: {"name": "", "type": "UUID|TEXT|INTEGER|BOOLEAN|TIMESTAMP|JSONB|FLOAT", "required": true/false}

## files
- Arquivos reais do app
- Cada arquivo: {"path": "/src/...", "type": "ts|tsx|json", "purpose": "função", "content_summary": "resumo"}

## chat_summary
- 2-3 frases resumindo o que foi criado
- Português brasileiro, tom consultivo e premium
- Termine com sugestão de próximo passo
- NUNCA inclua código, schemas, definições de tabela ou blocos técnicos

${isPatch ? `# MODO PATCH
Preserve a estrutura existente. Aplique APENAS as mudanças necessárias.
${currentState ? `\nEstado atual:\n${currentState}` : ""}` : `# MODO CREATE
Crie a V1 mais sólida possível. Priorize clareza e coerência.`}

RETORNE SOMENTE O JSON.`;
}



const OPENAI_MODEL_MAP: Record<string, string> = {
  "gpt-5.2": "gpt-4o",
  "gpt-5": "gpt-4o",
  "gpt-5-mini": "gpt-4o-mini",
  "gpt-5-nano": "gpt-4o-mini",
  "gpt-4o": "gpt-4o",
  "gpt-4o-mini": "gpt-4o-mini",
  "gpt-4-turbo": "gpt-4-turbo",
  "gpt-3.5-turbo": "gpt-3.5-turbo",
};

const ANTHROPIC_MODEL_MAP: Record<string, string> = {
  "claude-4-sonnet": "claude-sonnet-4-20250514",
  "claude-3.5-sonnet": "claude-3-5-sonnet-20241022",
  "claude-3-haiku": "claude-3-haiku-20240307",
};

type SupportedProvider = "openai" | "anthropic" | "gemini" | "openrouter";

function validateProviderKey(provider: SupportedProvider, apiKey: string) {
  const normalized = apiKey.trim();
  if (!normalized) {
    return { valid: false, normalized, error: "Chave de API ausente." };
  }

  if (provider === "openai" && !normalized.startsWith("sk-")) {
    return { valid: false, normalized, error: "A chave da OpenAI deve começar com 'sk-'." };
  }

  if (provider === "openrouter" && !normalized.startsWith("sk-or-")) {
    return { valid: false, normalized, error: "A chave do OpenRouter deve começar com 'sk-or-'." };
  }

  if (provider === "gemini" && !normalized.startsWith("AIza")) {
    return { valid: false, normalized, error: "A chave do Gemini deve começar com 'AIza'." };
  }

  return { valid: true, normalized };
}

async function getAuthContext(authHeader: string | null) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!authHeader || !supabaseUrl || !supabaseAnonKey) {
    return { supabase: null, user: null };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { supabase: null, user: null };
  }

  return { supabase, user };
}

async function getUserApiKeys(authHeader: string | null) {
  const auth = await getAuthContext(authHeader);
  if (!auth.supabase || !auth.user) {
    return { ...auth, keys: {} as Partial<Record<SupportedProvider, string>> };
  }

  const { data } = await auth.supabase
    .from("user_api_keys")
    .select("provider, api_key")
    .eq("user_id", auth.user.id);

  const keys = (data || []).reduce((acc, row) => {
    const provider = row.provider as SupportedProvider;
    if (["openai", "anthropic", "gemini", "openrouter"].includes(provider) && typeof row.api_key === "string" && row.api_key.trim()) {
      acc[provider] = row.api_key.trim();
    }
    return acc;
  }, {} as Partial<Record<SupportedProvider, string>>);

  return { ...auth, keys };
}

function pickPreferredProvider(
  keys: Partial<Record<SupportedProvider, string>>,
  requestedProvider?: string,
): SupportedProvider | null {
  if (requestedProvider && requestedProvider in keys && keys[requestedProvider as SupportedProvider]) {
    return requestedProvider as SupportedProvider;
  }

  return ["openai", "gemini", "anthropic", "openrouter"].find((provider) => !!keys[provider as SupportedProvider]) as SupportedProvider | null;
}

async function buildStructuredResponse({
  messages,
  systemPrompt,
  requestedModel,
  requestedProvider,
  authHeader,
}: {
  messages: Array<{ role: string; content: string }>;
  systemPrompt: string;
  requestedModel?: string;
  requestedProvider?: string;
  authHeader: string | null;
}) {
  const finalMessages = [{ role: "system", content: systemPrompt }, ...messages];
  const { keys } = await getUserApiKeys(authHeader);
  const selectedProvider = pickPreferredProvider(keys, requestedProvider);

  if (selectedProvider === "openai" && keys.openai) {
    const validation = validateProviderKey("openai", keys.openai);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${validation.normalized}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL_MAP[requestedModel || ""] || requestedModel || "gpt-4o-mini",
        messages: finalMessages,
        stream: false,
        response_format: { type: "json_object" },
      }),
    });

    return { response, parser: "openai" as const, provider: selectedProvider };
  }

  if (selectedProvider === "gemini" && keys.gemini) {
    const validation = validateProviderKey("gemini", keys.gemini);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${validation.normalized}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: requestedModel || "gemini-2.5-flash",
        messages: finalMessages,
        stream: false,
        response_format: { type: "json_object" },
      }),
    });

    return { response, parser: "openai" as const, provider: selectedProvider };
  }

  if (selectedProvider === "anthropic" && keys.anthropic) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": keys.anthropic,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL_MAP[requestedModel || ""] || requestedModel || "claude-3-5-sonnet-20241022",
        system: systemPrompt,
        messages,
        max_tokens: 4096,
      }),
    });

    return { response, parser: "anthropic" as const, provider: selectedProvider };
  }

  if (selectedProvider === "openrouter" && keys.openrouter) {
    const validation = validateProviderKey("openrouter", keys.openrouter);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${validation.normalized}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://aikortex.lovable.app",
        "X-OpenRouter-Title": "Aikortex",
      },
      body: JSON.stringify({
        model: requestedModel || "openai/gpt-5-mini",
        messages: finalMessages,
        stream: false,
        response_format: { type: "json_object" },
      }),
    });

    return { response, parser: "openai" as const, provider: selectedProvider };
  }

  // Fallback: plataforma via callLLM (single source of truth — available_llms)
  const adminClient = buildAdminClient();
  const result = await callLLM(finalMessages, {
    tier: "free",
    preferredModel: requestedModel,
    maxTokens: 4096,
    responseFormat: { type: "json_object" },
    timeoutMs: 20000,
  }, adminClient);

  const status = result.success ? 200 : (result.status_code || 503);
  const body = result.success
    ? { choices: [{ message: { content: result.content } }] }
    : { error: result.error };
  const synthetic = new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
  return { response: synthetic, parser: "openai" as const, provider: "openrouter" as const };
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const authResult = await getSharedAuthContext(req);
  if (authResult instanceof Response) return authResult;

  if (authResult.agencyId) {
    const allowed = await checkRateLimit(authResult.agencyId);
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // Quota check — wrapped in try-catch (fail-open) to prevent unhandled throws
  if (authResult.agencyId) {
    try {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false } }
      );

      const yearMonth = new Date().toISOString().slice(0, 7);

      const { data: agencyProfile } = await adminClient
        .from("agency_profiles")
        .select("tier")
        .eq("id", authResult.agencyId)
        .single();

      const tier = agencyProfile?.tier ?? "start";

      const { data: limitRow } = await adminClient
        .from("plan_message_limits")
        .select("monthly_limit")
        .eq("plan_slug", tier)
        .single();

      const monthlyLimit = limitRow?.monthly_limit ?? 100;

      const { data: usageRow } = await adminClient
        .from("agency_monthly_usage")
        .select("message_count")
        .eq("agency_id", authResult.agencyId)
        .eq("year_month", yearMonth)
        .single();

      const currentCount = usageRow?.message_count ?? 0;

      if (currentCount >= monthlyLimit) {
        return new Response(
          JSON.stringify({ error: "quota_exceeded", message: "Cota mensal atingida. Conecte sua chave de API para continuar." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      adminClient.rpc("increment_agency_usage", {
        p_agency_id: authResult.agencyId,
        p_year_month: yearMonth,
      }).then(() => {}).catch(console.error);
    } catch (quotaErr) {
      console.error("quota check error (fail-open):", quotaErr);
      // Fail-open: allow the request to proceed if quota check throws
    }
  }

  try {
    const body = await req.json();
    const { messages, appContext, mode, model: requestedModel, provider: requestedProvider } = body;
    const authHeader = req.headers.get("Authorization");

    /* ── Mode: agent-chat / wizard-setup ── */
    if (mode === "agent-chat" || mode === "wizard-setup") {
      const { agentConfig = {}, stream: streamMode = true } = body as {
        agentId?: string;
        agentConfig?: Record<string, unknown>;
        stream?: boolean;
      };
      const agentContext = ((body as any).agentContext || {}) as Record<string, unknown>;
      const agentId = typeof (body as any).agentId === "string"
        ? (body as any).agentId
        : typeof agentContext.agentId === "string"
          ? agentContext.agentId
          : undefined;
      const runtimeAgentConfig = Object.keys(agentConfig || {}).length ? agentConfig : agentContext;
      const sseHeaders = { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no" };

      // Ownership validation
      if (agentId) {
        const supabaseSvc = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        const { data: agent } = await supabaseSvc
          .from("user_agents")
          .select("id, user_id")
          .eq("id", agentId)
          .maybeSingle();
        if (!agent || agent.user_id !== authResult.user.id) {
          return new Response(JSON.stringify({ error: "Agente não encontrado ou sem permissão." }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      // Build messages:
      // - wizard-setup: SEMPRE usa buildWizardSystemPrompt do backend (Master v7.4 §13.2),
      //   independente de agentId. Strippa qualquer system message do frontend pra evitar
      //   override do prompt canônico.
      // - agent-chat com agentId: usa buildAgentSystemPrompt
      // - agent-chat sem agentId: frontend manda o system na própria lista de messages
      const incomingMessages = (messages || []) as Array<{ role: string; content: string }>;
      let chatMessages: Array<{ role: string; content: string }>;
      if (mode === "wizard-setup") {
        const wizardSystem = buildWizardSystemPrompt(
          String((body as Record<string, unknown>).agentType || "Custom"),
          typeof (body as any).niche === "string" && (body as any).niche
            ? (body as any).niche
            : undefined,
        );
        // Remove qualquer system anterior do frontend — backend é fonte de verdade
        const nonSystem = incomingMessages.filter((m) => m.role !== "system");
        chatMessages = [{ role: "system", content: wizardSystem }, ...nonSystem];
      } else if (agentId) {
        chatMessages = [
          { role: "system", content: buildAgentSystemPrompt((runtimeAgentConfig || {}) as Record<string, unknown>) },
          ...incomingMessages,
        ];
      } else {
        chatMessages = incomingMessages;
      }

      // Tool-aware path branches:
      //  - wizard-setup + agentId → runWizardWithTools (Modo Vibe acting, Master §13.2/§13.16)
      //  - agent-chat + agentId → runAgentLLM (runtime tools do agente já configurado)
      //  - sem agentId → bufferFromPlatform (chat livre)
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false } },
      );
      const preferred = (body as any).model as string | undefined;
      const userJwt = authHeader?.replace(/^Bearer\s+/i, "") ?? null;

      let content = "";
      if (mode === "wizard-setup" && agentId) {
        // Modo Vibe acting: o wizard AGE no draft via tool-calling.
        const { content: wizContent, toolsExecuted } = await runWizardWithTools({
          supabase: adminClient,
          agentId,
          agencyId: authResult.agencyId,
          messages: chatMessages,
          maxTokens: 1500,
          userJwt,
        });
        content = wizContent;
        if (toolsExecuted.length > 0) {
          console.log(`[wizard-setup] ${agentId} aplicou ${toolsExecuted.length} mutações:`, toolsExecuted.map(t => t.name).join(", "));
        }
      } else if (agentId) {
        // Split system + rest so runAgentLLM can prepend system itself.
        // models omitted → helper loads from available_llms (single source of truth).
        const sysMsg = chatMessages.find((m) => m.role === "system");
        const rest = chatMessages.filter((m) => m.role !== "system");
        content = (await runAgentLLM({
          supabase: adminClient,
          agentId,
          agencyId: authResult.agencyId,
          system: sysMsg?.content || "",
          messages: rest,
          maxTokens: 2048,
          userJwt,
        })) || "";
      } else {
        content = await bufferFromPlatform(chatMessages, preferred, adminClient);
      }

      if (streamMode === false) {
        return new Response(
          JSON.stringify({ response: content || "Não foi possível gerar resposta." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        streamText(content || "⚠️ Serviço de IA temporariamente indisponível. Tente novamente."),
        { headers: sseHeaders }
      );
    }

    /* ── Mode: structure (non-streaming JSON) ── */
    const isStructureMode = mode === "structure";

    const systemPrompt = isStructureMode
      ? buildStructuringPrompt(
          appContext?.app_type || "web",
          appContext?.language || "pt-BR",
          appContext?.niche || undefined,
        )
      : buildAppStatePrompt(appContext);

    const structured = await buildStructuredResponse({
      messages,
      systemPrompt,
      requestedModel,
      requestedProvider,
      authHeader,
    });

    if (structured instanceof Response) {
      return structured;
    }

    const { response, parser, provider } = structured;

    if (!response.ok) {
      if (response.status === 401) {
        return new Response(JSON.stringify({ error: provider === "openai" ? "Chave da OpenAI inválida. Verifique sua configuração em Integrações." : "Chave de API inválida. Verifique sua configuração em Integrações." }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos em Configurações." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = parser === "anthropic"
      ? data.content?.find?.((block: { type?: string }) => block.type === "text")?.text || "{}"
      : data.choices?.[0]?.message?.content || "{}";

    if (isStructureMode) {
      return new Response(JSON.stringify({ structuredConfig: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ appStateRaw: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
