import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuthContext as getSharedAuthContext, handleCors, corsHeaders } from "../_shared/auth.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

// ── OpenRouter platform helpers ───────────────────────────────────────────
const PLATFORM_FREE_MODELS = [
  "qwen/qwen3-30b-a3b:free",
  "google/gemini-2.5-flash-preview-04-17:free",
  "google/gemma-3-27b-it:free",
  "deepseek/deepseek-chat-v3-0324:free",
];

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

async function streamFromOpenRouterPlatform(
  messages: Array<{ role: string; content: string }>,
  preferredModel?: string
): Promise<Response | null> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";
  if (!apiKey) { console.error("OPENROUTER_API_KEY not set"); return null; }
  const modelsToTry = preferredModel
    ? [preferredModel, ...PLATFORM_FREE_MODELS.filter(m => m !== preferredModel)]
    : PLATFORM_FREE_MODELS;
  for (const model of modelsToTry) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://aikortex.com",
          "X-Title": "Aikortex",
        },
        body: JSON.stringify({ model, messages, stream: true, max_tokens: 2048 }),
      });
      clearTimeout(timeout);
      if ([400, 404, 429, 500, 502, 503].includes(resp.status)) continue;
      if (!resp.ok) continue;
      return resp;
    } catch { continue; }
  }
  return null;
}

async function bufferFromOpenRouterPlatform(
  messages: Array<{ role: string; content: string }>,
  preferredModel?: string
): Promise<string> {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";
  if (!apiKey) return "";
  const modelsToTry = preferredModel
    ? [preferredModel, ...PLATFORM_FREE_MODELS.filter(m => m !== preferredModel)]
    : PLATFORM_FREE_MODELS;
  for (const model of modelsToTry) {
    try {
      const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://aikortex.com",
          "X-Title": "Aikortex",
        },
        body: JSON.stringify({ model, messages, stream: false, max_tokens: 2048 }),
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      const content = data?.choices?.[0]?.message?.content || "";
      if (content) return content;
    } catch { continue; }
  }
  return "";
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
  if (isSdr) {
    return `Você é ${name}, agente SDR${company ? ` da ${company}` : ""}.
Objetivo: ${objective || "Qualificar leads e agendar reuniões."}
Tom: ${tone}
Instruções: ${instructions}
Regras: faça UMA pergunta por vez. Colete nome, email, telefone, empresa, cargo. Qualifique com BANT. Responda em português do Brasil.`;
  }
  return `Você é ${name}${company ? ` da ${company}` : ""}.
Objetivo: ${objective}
Tom: ${tone}
Instruções: ${instructions}
Responda em português do Brasil.`;
}

function buildWizardSystemPrompt(agentType: string): string {
  return `Você é um configurador de agentes IA. Configure um agente do tipo "${agentType}". Faça perguntas UMA por vez aguardando a resposta. Máximo 1 frase por mensagem. Sem introduções. Responda em português do Brasil.`;
}

/* ── Structuring prompt ── */

function buildStructuringPrompt(appType: string, language: string) {
  if (appType === "agent") {
    return `Você é um arquiteto especializado em agentes de IA conversacionais.

Sua ÚNICA tarefa é analisar a descrição do usuário e retornar um JSON estruturado que define completamente o agente a ser construído.

REGRAS:
- Retorne APENAS um bloco JSON válido, sem texto antes ou depois
- Infira o máximo possível da descrição: nome, tipo, tom, objetivo, instruções, mensagem de saudação
- Se algo não for mencionado, use valores padrão inteligentes

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

  // Fallback: OpenRouter com chave da plataforma (sem BYOK do usuário)
  const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
  if (!OPENROUTER_API_KEY) {
    return new Response(JSON.stringify({ error: "Serviço de IA não configurado." }), {
      status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://aikortex.com",
      "X-Title": "Aikortex",
    },
    body: JSON.stringify({
      model: requestedModel || "qwen/qwen3-30b-a3b:free",
      messages: finalMessages,
      stream: false,
      response_format: { type: "json_object" },
    }),
  });
  return { response, parser: "openai" as const, provider: "openrouter" as const };
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

  // Rate limiting por agência
  if (authResult.agencyId) {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const yearMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    // Buscar tier e limite
    const { data: agencyProfile } = await adminClient
      .from("agency_profiles")
      .select("tier")
      .eq("id", authResult.agencyId)
      .single();

    const tier = agencyProfile?.tier ?? "starter";

    const { data: limitRow } = await adminClient
      .from("plan_message_limits")
      .select("monthly_limit")
      .eq("plan_slug", tier)
      .single();

    const monthlyLimit = limitRow?.monthly_limit ?? 100;

    // Verificar uso atual
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

    // Incrementar após verificação (fora do fluxo principal, não bloqueia resposta)
    adminClient.rpc("increment_agency_usage", {
      p_agency_id: authResult.agencyId,
      p_year_month: yearMonth,
    }).then(() => {}).catch(console.error);
  }

  try {
    const body = await req.json();
    const { messages, appContext, mode, model: requestedModel, provider: requestedProvider } = body;
    const authHeader = req.headers.get("Authorization");

    /* ── Mode: agent-chat / wizard-setup ── */
    if (mode === "agent-chat" || mode === "wizard-setup") {
      const { agentId, agentConfig = {}, stream: streamMode = true } = body as {
        agentId?: string;
        agentConfig?: Record<string, unknown>;
        stream?: boolean;
      };
      const sseHeaders = { ...corsHeaders, "Content-Type": "text/event-stream" };

      // Ownership validation
      if (agentId) {
        const supabaseSvc = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        const { data: agent } = await supabaseSvc
          .from("agents")
          .select("agency_id")
          .eq("id", agentId)
          .maybeSingle();
        if (!agent || agent.agency_id !== authResult.agencyId) {
          return new Response(JSON.stringify({ error: "Agente não encontrado ou sem permissão." }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      // Build messages: sem agentId, o frontend já incluiu o system prompt — usar as mensagens como estão
      const chatMessages: Array<{ role: string; content: string }> = agentId
        ? [
            { role: "system", content: mode === "wizard-setup"
              ? buildWizardSystemPrompt(String((body as Record<string, unknown>).agentType || "custom"))
              : buildAgentSystemPrompt((agentConfig || {}) as Record<string, unknown>) },
            ...((messages || []) as Array<{ role: string; content: string }>),
          ]
        : ((messages || []) as Array<{ role: string; content: string }>);

      // Non-streaming
      if (streamMode === false) {
        const content = await bufferFromOpenRouterPlatform(chatMessages, (body as any).model);
        return new Response(
          JSON.stringify({ response: content || "Não foi possível gerar resposta." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Streaming SSE — tenta o modelo solicitado primeiro, depois os gratuitos como fallback
      const orResp = await streamFromOpenRouterPlatform(chatMessages, (body as any).model);
      if (!orResp?.body) {
        return new Response(
          streamText("⚠️ Serviço de IA temporariamente indisponível. Tente novamente."),
          { headers: sseHeaders }
        );
      }
      return new Response(orResp.body, { headers: sseHeaders });
    }

    /* ── Mode: structure (non-streaming JSON) ── */
    const isStructureMode = mode === "structure";

    const systemPrompt = isStructureMode
      ? buildStructuringPrompt(appContext?.app_type || "web", appContext?.language || "pt-BR")
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
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
