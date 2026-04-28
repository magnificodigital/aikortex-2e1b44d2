import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODEL_MAP: Record<string, { gateway: string; openai?: string; anthropic?: string }> = {
  // OpenAI BYOK models → map to actual OpenAI API model IDs
  "o3": { gateway: "openai/gpt-5", openai: "o3" },
  "o3-mini": { gateway: "openai/gpt-5-mini", openai: "o3-mini" },
  "o1": { gateway: "openai/gpt-5", openai: "o1" },
  "o1-mini": { gateway: "openai/gpt-5-mini", openai: "o1-mini" },
  "gpt-4.5-preview": { gateway: "openai/gpt-5", openai: "gpt-4.5-preview" },
  "gpt-4o": { gateway: "openai/gpt-5", openai: "gpt-4o" },
  "gpt-4o-mini": { gateway: "openai/gpt-5-mini", openai: "gpt-4o-mini" },
  "gpt-4-turbo": { gateway: "openai/gpt-5", openai: "gpt-4-turbo" },
  "gpt-4": { gateway: "openai/gpt-5", openai: "gpt-4" },
  "gpt-3.5-turbo": { gateway: "openai/gpt-5-mini", openai: "gpt-3.5-turbo" },
  // Anthropic BYOK models → map to actual Anthropic API model IDs
  "claude-opus-4-6": { gateway: "openai/gpt-5", anthropic: "claude-opus-4-6" },
  "claude-sonnet-4-6": { gateway: "openai/gpt-5", anthropic: "claude-sonnet-4-6" },
  "claude-haiku-4-5-20251001": { gateway: "openai/gpt-5-mini", anthropic: "claude-haiku-4-5-20251001" },
  "claude-3-5-sonnet-20241022": { gateway: "openai/gpt-5", anthropic: "claude-3-5-sonnet-20241022" },
  "claude-3-5-haiku-20241022": { gateway: "openai/gpt-5-mini", anthropic: "claude-3-5-haiku-20241022" },
  "claude-3-opus-20240229": { gateway: "openai/gpt-5", anthropic: "claude-3-opus-20240229" },
  "claude-3-sonnet-20240229": { gateway: "openai/gpt-5", anthropic: "claude-3-sonnet-20240229" },
  "claude-3-haiku-20240307": { gateway: "openai/gpt-5-mini", anthropic: "claude-3-haiku-20240307" },
};

const FREE_GATEWAY_MODELS = [
  "google/gemma-3-12b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "openai/gpt-oss-20b:free",
] as const;

const DEFAULT_FREE_GATEWAY_MODEL = FREE_GATEWAY_MODELS[0];

// Default free model for non-BYOK users (Rule 4)
const DEFAULT_FREE_MODEL = "google/gemini-2.5-flash-preview-04-17";

// Valid models accepted by Lovable AI Gateway
const VALID_GATEWAY_MODELS = new Set([
  "openai/gpt-5-mini", "openai/gpt-5", "openai/gpt-5-nano", "openai/gpt-5.2",
  "google/gemini-2.5-pro", "google/gemini-2.5-flash", "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-flash-image", "google/gemini-3-flash-preview",
  "google/gemini-3-pro-image-preview", "google/gemini-3.1-pro-preview",
  "google/gemini-3.1-flash-image-preview",
]);

const DEFAULT_GATEWAY_MODEL = "google/gemini-3-flash-preview";

/** Ensure a model ID is valid for the Lovable AI Gateway, remap if not */
function ensureValidGatewayModel(model?: string | null): string {
  if (!model) return DEFAULT_GATEWAY_MODEL;
  if (VALID_GATEWAY_MODELS.has(model)) return model;
  // Try common remaps for deprecated models
  if (model.includes("gemini-2.0") || model.includes("gemini-1.5")) return "google/gemini-2.5-flash";
  if (model.includes("llama")) return DEFAULT_GATEWAY_MODEL;
  if (model.includes("gemini")) return "google/gemini-2.5-flash";
  return DEFAULT_GATEWAY_MODEL;
}

type ChatCompletionMessage = { role: string; content: string };

const PROVIDER_PREFIX_RULES: Record<string, string[]> = {
  openai: ["gpt-", "o1", "o3"],
  anthropic: ["claude-"],
  gemini: ["gemini-", "google/"],
  openrouter: ["/"],
};

function modelBelongsToProvider(provider: string, model?: string | null) {
  if (!model) return true;
  // Models with a slash are OpenRouter-routed — skip provider ownership validation
  if (model.includes("/")) return true;
  const prefixes = PROVIDER_PREFIX_RULES[provider];
  if (!prefixes) return true;
  if (provider === "openrouter") return model.includes("/");
  return prefixes.some((prefix) => model.startsWith(prefix));
}

function normalizeGatewayModel(model?: string | null) {
  if (!model) return DEFAULT_FREE_GATEWAY_MODEL;
  return FREE_GATEWAY_MODELS.includes(model as typeof DEFAULT_FREE_GATEWAY_MODEL)
    ? model
    : DEFAULT_FREE_GATEWAY_MODEL;
}

function flattenSystemMessagesForGateway(messages: ChatCompletionMessage[]) {
  const systemInstructions = messages
    .filter((message) => message.role === "system" && typeof message.content === "string" && message.content.trim())
    .map((message) => message.content.trim());

  if (systemInstructions.length === 0) return messages;

  const mergedInstructions = `Siga estas instruções durante toda a conversa:\n${systemInstructions.join("\n\n")}`;
  const nonSystemMessages = messages.filter((message) => message.role !== "system");
  const firstUserIndex = nonSystemMessages.findIndex((message) => message.role === "user");

  if (firstUserIndex === -1) {
    return [{ role: "user", content: mergedInstructions }, ...nonSystemMessages];
  }

  return nonSystemMessages.map((message, index) =>
    index === firstUserIndex
      ? {
          ...message,
          content: `${mergedInstructions}\n\nMensagem do usuário:\n${message.content}`,
        }
      : message,
  );
}

function gatewayRejectedDeveloperInstruction(errorText: string) {
  return errorText.toLowerCase().includes("developer instruction");
}

function validateOpenRouterApiKey(apiKey?: string | null) {
  const normalized = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!normalized) {
    return { valid: false, normalized: "", error: "OpenRouter API key is required." };
  }

  if (!normalized.startsWith("sk-or-")) {
    return {
      valid: false,
      normalized,
      error: "Invalid OpenRouter API key format. Keys should start with 'sk-or-'.",
    };
  }

  return { valid: true, normalized };
}

function collectOpenRouterKeys(...keys: Array<string | null | undefined>) {
  const uniqueKeys: string[] = [];

  for (const key of keys) {
    const validation = validateOpenRouterApiKey(key);
    if (!validation.valid) continue;
    if (!uniqueKeys.includes(validation.normalized)) {
      uniqueKeys.push(validation.normalized);
    }
  }

  return uniqueKeys;
}

function buildAgentSystemPrompt(agentContext?: Record<string, unknown>) {
  if (!agentContext || typeof agentContext !== "object") return null;
  const name = typeof agentContext.name === "string" ? agentContext.name : "Agente";
  const description = typeof agentContext.description === "string" ? agentContext.description : "";
  const role = typeof agentContext.role === "string" ? agentContext.role : "";
  const objective = typeof agentContext.objective === "string" ? agentContext.objective : "";
  const instructions = typeof agentContext.instructions === "string" ? agentContext.instructions : "";
  const toneOfVoice = typeof agentContext.toneOfVoice === "string" ? agentContext.toneOfVoice : "";
  const greetingMessage = typeof agentContext.greetingMessage === "string" ? agentContext.greetingMessage : "";
  const memory = typeof agentContext.memory === "string" ? agentContext.memory : "";
  const channels = Array.isArray(agentContext.channels) ? agentContext.channels.join(", ") : "";
  const integrations = Array.isArray(agentContext.integrations) ? agentContext.integrations.join(", ") : "";
  const tools = Array.isArray(agentContext.tools) ? agentContext.tools.join(", ") : "";
  const knowledgeFiles = Array.isArray(agentContext.knowledgeFiles) ? agentContext.knowledgeFiles.join(", ") : "";
  const urls = Array.isArray(agentContext.urls) ? agentContext.urls.join(", ") : "";

  const sections = [
    `Você é o agente "${name}" e deve responder exatamente conforme a configuração recebida.`,
    role ? `Função: ${role}` : null,
    objective ? `Objetivo: ${objective}` : null,
    description ? `Descrição e instruções: ${description}` : null,
    instructions ? `Regras adicionais: ${instructions}` : null,
    toneOfVoice ? `Tom de voz: ${toneOfVoice}` : null,
    greetingMessage ? `Mensagem de saudação: ${greetingMessage}` : null,
    memory ? `Memória/contexto persistente: ${memory}` : null,
    channels ? `Canais habilitados: ${channels}` : null,
    integrations ? `Integrações habilitadas: ${integrations}` : null,
    tools ? `Ferramentas habilitadas: ${tools}` : null,
    knowledgeFiles ? `Arquivos de conhecimento: ${knowledgeFiles}` : null,
    urls ? `URLs de referência: ${urls}` : null,
    "Nunca responda como um assistente genérico se houver identidade configurada.",
    "Seja coerente com nome, papel, objetivo, tom e contexto do agente.",
    "Responda sempre em português brasileiro.",
  ].filter(Boolean);

  return sections.join("\n\n");
}

// Helper: read a config value from platform_config (service_role)
async function getPlatformConfig(supabaseUrl: string, serviceKey: string, key: string): Promise<string | null> {
  const admin = createClient(supabaseUrl, serviceKey);
  const { data } = await admin.from("platform_config").select("value").eq("key", key).maybeSingle();
  return data?.value || null;
}

// Helper: get OpenRouter API key from env or platform_config
async function getOpenRouterKey(supabaseUrl: string, serviceKey: string): Promise<string> {
  let key = Deno.env.get("OPENROUTER_API_KEY") || "";
  if (!key) {
    key = await getPlatformConfig(supabaseUrl, serviceKey, "OPENROUTER_API_KEY") || "";
  }
  return key;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, provider, model, useGateway, gatewayModel, temperature, max_tokens, top_p, frequency_penalty, presence_penalty, response_format, stop, agentContext } = await req.json();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Access check: BYOK or monthly plan limit ---
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isPlatformUser = ["platform_owner", "platform_admin"].includes(profileData?.role);

    // Check if user has ANY BYOK key configured (any provider = unlimited)
    let hasByok = false;
    let userByokProviders: string[] = [];

    if (!isPlatformUser) {
      const { data: byokKeys } = await supabase
        .from("user_api_keys")
        .select("provider")
        .eq("user_id", user.id)
        .in("provider", ["openai", "anthropic", "gemini", "openrouter"]);
      hasByok = (byokKeys?.length ?? 0) > 0;
      userByokProviders = byokKeys?.map((k: any) => k.provider) || [];
    }

    // Get user plan slug
    let planSlug = "starter";
    if (!isPlatformUser) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("plan_id, plans(slug)")
        .eq("user_id", user.id)
        .in("status", ["active", "trialing"])
        .maybeSingle();
      planSlug = (sub?.plans as any)?.slug || "starter";
    }

    // ══════════════════════════════════════════════════════════
    // RULE 2 — Elite plan requires BYOK
    // ══════════════════════════════════════════════════════════
    if (!isPlatformUser && planSlug === "elite" && !hasByok) {
      return new Response(JSON.stringify({
        error: "Plano Elite requer chave de API própria (BYOK). Configure em Configurações → Integrações.",
        code: "BYOK_REQUIRED",
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no BYOK and not platform: check monthly plan limit
    if (!isPlatformUser && !hasByok) {
      const yearMonth = new Date().toISOString().slice(0, 7);

      const { data: limitData } = await supabase
        .from("plan_message_limits")
        .select("monthly_limit")
        .eq("plan_slug", planSlug)
        .maybeSingle();

      const monthlyLimit = limitData?.monthly_limit ?? 500;

      if (monthlyLimit !== -1) {
        const { data: usageData } = await supabase
          .from("monthly_usage")
          .select("message_count")
          .eq("user_id", user.id)
          .eq("year_month", yearMonth)
          .maybeSingle();

        const currentCount = usageData?.message_count || 0;

        if (currentCount >= monthlyLimit) {
          return new Response(JSON.stringify({
            error: `Limite mensal de ${monthlyLimit} mensagens atingido no plano ${planSlug}. Configure uma chave de API própria em Configurações > Integrações para uso ilimitado, ou faça upgrade do plano.`
          }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // ══════════════════════════════════════════════════════════
    // RULE 1 — Starter/Pro without BYOK → force Gemini Flash via OpenRouter
    // ══════════════════════════════════════════════════════════
    const forceFreeTier = !isPlatformUser && !hasByok && ["starter", "pro"].includes(planSlug);

    const selectedProvider = provider || "openai";
    if (!useGateway && !forceFreeTier && !modelBelongsToProvider(selectedProvider, model)) {
      return new Response(JSON.stringify({ error: `O modelo \"${model}\" não pertence ao provider \"${selectedProvider}\".` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const modelMapping = MODEL_MAP[model] || null;

    let apiUrl: string;
    let apiKey: string | null = "";
    let apiModel = modelMapping?.gateway || model || "google/gemini-2.5-flash-preview-04-17";
    // Detect if the selected model is an OpenRouter-routed model (has slash in ID, no BYOK needed)
    const isOpenRouterModel = typeof model === "string" && model.includes("/") && !modelMapping;
    let headers: Record<string, string>;
    let openRouterKeyCandidates: Array<string | null> = [];
    let gatewayModelCandidates: string[] = [];

    // ── Force free tier for starter/pro without BYOK (Rule 1 + Rule 4) ──
    if (forceFreeTier) {
      apiUrl = "https://openrouter.ai/api/v1/chat/completions";
      apiModel = DEFAULT_FREE_MODEL;
      const openRouterKey = await getOpenRouterKey(supabaseUrl, serviceKey);
      headers = {
        "Content-Type": "application/json",
        "HTTP-Referer": "https://aikortex.lovable.app",
        "X-OpenRouter-Title": "Aikortex",
      };
      if (openRouterKey) {
        headers["Authorization"] = `Bearer ${openRouterKey}`;
      }
      apiKey = openRouterKey || null;
      // Simple path: single model, single key, no fallback cascade needed
      openRouterKeyCandidates = openRouterKey ? [openRouterKey] : [null];
      gatewayModelCandidates = [DEFAULT_FREE_MODEL];
      console.log(`Force free tier: plan=${planSlug}, model=${apiModel}`);
    } else if (useGateway) {
      // If useGateway is true, use OpenRouter with stable free assistant defaults
      apiUrl = "https://openrouter.ai/api/v1/chat/completions";
      apiModel = normalizeGatewayModel(gatewayModel);
      headers = {
        "Content-Type": "application/json",
        "HTTP-Referer": "https://aikortex.lovable.app",
        "X-OpenRouter-Title": "Aikortex",
      };

      const { data: orKeyData } = await supabase
        .from("user_api_keys")
        .select("api_key")
        .eq("provider", "openrouter")
        .eq("user_id", user.id)
        .maybeSingle();

      const userOpenRouterKey = orKeyData?.api_key ?? "";
      const projectOpenRouterKey = await getOpenRouterKey(supabaseUrl, serviceKey);

      if (userOpenRouterKey) {
        const validation = validateOpenRouterApiKey(userOpenRouterKey);
        if (!validation.valid) {
          console.warn(`Ignoring invalid user OpenRouter key for user ${user.id}: ${validation.error}`);
        }
      }

      openRouterKeyCandidates = collectOpenRouterKeys(userOpenRouterKey, projectOpenRouterKey);
      gatewayModelCandidates = [
        apiModel,
        ...FREE_GATEWAY_MODELS.filter((candidate) => candidate !== apiModel),
      ];

      if (openRouterKeyCandidates.length === 0) {
        openRouterKeyCandidates = [null];
      }

      apiKey = openRouterKeyCandidates[0] ?? "";
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }
    } else if (isOpenRouterModel) {
      // Model with slash in ID (e.g. google/gemini-2.5-pro) → route via OpenRouter platform key
      apiUrl = "https://openrouter.ai/api/v1/chat/completions";
      apiModel = model;
      const openRouterKey = await getOpenRouterKey(supabaseUrl, serviceKey);
      headers = {
        "Content-Type": "application/json",
        "HTTP-Referer": "https://aikortex.lovable.app",
        "X-OpenRouter-Title": "Aikortex",
      };
      if (openRouterKey) {
        headers["Authorization"] = `Bearer ${openRouterKey}`;
      }
      apiKey = openRouterKey || null;
      openRouterKeyCandidates = openRouterKey ? [openRouterKey] : [null];
      gatewayModelCandidates = [apiModel, DEFAULT_FREE_MODEL];
      console.log(`OpenRouter model: ${apiModel}`);
    } else {
      // Try user's own API key first
      const { data: keyData } = await supabase
        .from("user_api_keys")
        .select("api_key")
        .eq("provider", selectedProvider)
        .eq("user_id", user.id)
        .maybeSingle();

      if (keyData?.api_key) {
        if (selectedProvider === "openai") {
          apiUrl = "https://api.openai.com/v1/chat/completions";
          apiKey = keyData.api_key;
          apiModel = modelMapping?.openai || model || "gpt-4o-mini";
          headers = {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          };
        } else if (selectedProvider === "anthropic") {
          apiUrl = "https://api.anthropic.com/v1/messages";
          apiKey = keyData.api_key;
          apiModel = modelMapping?.anthropic || model || "claude-3-haiku-20240307";
          headers = {
            "x-api-key": apiKey,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
          };
        } else if (selectedProvider === "gemini") {
          const geminiModel = model?.replace("gemini-", "gemini-") || "gemini-2.5-flash";
          apiUrl = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;
          apiKey = keyData.api_key;
          apiModel = geminiModel;
          headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          };
        } else if (selectedProvider === "openrouter") {
          const validation = validateOpenRouterApiKey(keyData.api_key);
          if (!validation.valid) {
            return new Response(JSON.stringify({ error: "A chave do OpenRouter configurada é inválida. Ela deve começar com sk-or-." }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          apiUrl = "https://openrouter.ai/api/v1/chat/completions";
          apiKey = validation.normalized;
          apiModel = model || gatewayModel || "openai/gpt-5-mini";
          headers = {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://aikortex.lovable.app",
            "X-OpenRouter-Title": "Aikortex",
          };
        } else {
          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
          if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
          apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
          apiKey = LOVABLE_API_KEY;
          apiModel = ensureValidGatewayModel(modelMapping?.gateway || model);
          headers = {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          };
        }
      } else {
        // No user BYOK — try platform_config fallback for the requested provider
        if (provider && ["openai", "anthropic", "gemini", "openrouter"].includes(provider)) {
          const envKeyMap: Record<string, string> = {
            openai: "OPENAI_API_KEY", anthropic: "ANTHROPIC_API_KEY",
            gemini: "GEMINI_API_KEY", openrouter: "OPENROUTER_API_KEY",
          };
          const configKeyName = envKeyMap[provider];
          let platformKey = Deno.env.get(configKeyName) || "";
          if (!platformKey) {
            platformKey = await getPlatformConfig(supabaseUrl, serviceKey, configKeyName) || "";
          }

          if (platformKey) {
            if (provider === "openai") {
              apiUrl = "https://api.openai.com/v1/chat/completions";
              apiKey = platformKey;
              apiModel = modelMapping?.openai || model || "gpt-4o-mini";
              headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
            } else if (provider === "anthropic") {
              apiUrl = "https://api.anthropic.com/v1/messages";
              apiKey = platformKey;
              apiModel = modelMapping?.anthropic || model || "claude-3-haiku-20240307";
              headers = { "x-api-key": apiKey, "Content-Type": "application/json", "anthropic-version": "2023-06-01" };
            } else if (provider === "gemini") {
              const geminiModel = model?.replace("gemini-", "gemini-") || "gemini-2.5-flash";
              apiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
              apiKey = platformKey;
              apiModel = geminiModel;
              headers = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
            } else {
              apiUrl = "https://openrouter.ai/api/v1/chat/completions";
              apiKey = platformKey;
              apiModel = model || gatewayModel || "openai/gpt-5-mini";
              headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://aikortex.lovable.app", "X-OpenRouter-Title": "Aikortex" };
            }
          } else {
            return new Response(JSON.stringify({ error: `Nenhuma chave de API foi configurada para o provider \"${provider}\".` }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
          if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
          apiUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
          apiKey = LOVABLE_API_KEY;
          apiModel = ensureValidGatewayModel(modelMapping?.gateway || model);
          headers = {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          };
        }
      }
    }

    const defaultSystemPrompt = `Você é um agente de IA inteligente e prestativo. Responda sempre em português brasileiro. Seja direto, profissional e use markdown quando apropriado.`;
    const agentSystemPrompt = buildAgentSystemPrompt(agentContext);

    const hasSystemPrompt = messages.some((m: { role: string }) => m.role === "system");
    const finalMessages: ChatCompletionMessage[] = hasSystemPrompt
      ? agentSystemPrompt
        ? messages.map((message: { role: string; content: string }, index: number) => index === 0 && message.role === "system"
          ? { ...message, content: `${agentSystemPrompt}\n\n${message.content}` }
          : message)
        : messages
      : [{ role: "system", content: agentSystemPrompt || defaultSystemPrompt }, ...messages];

    const requestMessages = (useGateway || forceFreeTier || isOpenRouterModel)
      ? flattenSystemMessagesForGateway(finalMessages)
      : finalMessages;

    const body: Record<string, unknown> = {
      model: apiModel,
      messages: requestMessages,
      stream: true,
    };
    if (temperature !== undefined) body.temperature = temperature;
    if (max_tokens !== undefined) body.max_tokens = max_tokens;
    if (top_p !== undefined) body.top_p = top_p;
    if (frequency_penalty !== undefined) body.frequency_penalty = frequency_penalty;
    if (presence_penalty !== undefined) body.presence_penalty = presence_penalty;
    if (response_format) body.response_format = response_format;
    if (stop) body.stop = stop;

    console.log(`Using provider=${selectedProvider}, model=${apiModel}, useGateway=${useGateway}, forceFreeTier=${forceFreeTier}, plan=${planSlug}`);

    let response: Response | null = null;
    let lastErrorStatus = 0;
    let lastErrorText = "";
    const maxRetries = 3;
    const gatewayMaxRetries = 1;

    if (useGateway || forceFreeTier || isOpenRouterModel) {
      gatewayAttempt:
      for (const candidateModel of gatewayModelCandidates) {
        for (let keyIndex = 0; keyIndex < openRouterKeyCandidates.length; keyIndex += 1) {
          const candidateKey = openRouterKeyCandidates[keyIndex];
          const requestHeaders = candidateKey
            ? { ...headers, Authorization: `Bearer ${candidateKey}` }
            : { ...headers };

          for (let attempt = 0; attempt <= gatewayMaxRetries; attempt++) {
            response = await fetch(apiUrl, {
              method: "POST",
              headers: requestHeaders,
              body: JSON.stringify({ ...body, model: candidateModel }),
            });

            if (response.ok) {
              apiModel = candidateModel;
              apiKey = candidateKey;
              headers = requestHeaders;
              break gatewayAttempt;
            }

            if (response.status === 429 && attempt < gatewayMaxRetries) {
              const retryAfter = parseInt(response.headers.get("retry-after") || "0", 10);
              const waitMs = Math.max((retryAfter || (attempt + 1) * 2) * 1000, 1000);
              console.log(`Rate limited (429), retrying in ${waitMs}ms (attempt ${attempt + 1}/${gatewayMaxRetries})`);
              await new Promise((r) => setTimeout(r, waitMs));
              continue;
            }

            lastErrorStatus = response.status;
            lastErrorText = await response.text();
            console.error(`AI API error for model=${candidateModel}:`, response.status, lastErrorText);

            if (response.status === 401 && keyIndex < openRouterKeyCandidates.length - 1) {
              console.warn(`OpenRouter key failed for candidate ${keyIndex + 1}, trying fallback key`);
              break;
            }

            if (response.status === 404 && lastErrorText.includes("No endpoints found")) {
              console.warn(`OpenRouter model unavailable: ${candidateModel}. Trying next free model.`);
              break;
            }

            if (response.status === 404) {
              console.warn(`OpenRouter 404 for model: ${candidateModel}. Trying next free model.`);
              break;
            }

            if (response.status === 400 && gatewayRejectedDeveloperInstruction(lastErrorText)) {
              console.warn(`OpenRouter model rejected developer instructions: ${candidateModel}. Trying next free model.`);
              break;
            }

            if (response.status === 429) {
              console.warn(`OpenRouter model rate limited after retries: ${candidateModel}. Trying next free model.`);
              break;
            }

            break gatewayAttempt;
          }

          if (response?.ok) break;
          if (lastErrorStatus === 404 && lastErrorText.includes("No endpoints found")) break;
          if (lastErrorStatus === 400 && gatewayRejectedDeveloperInstruction(lastErrorText)) break;
          if (lastErrorStatus === 429) break;
        }

        if (response?.ok) break;
      }

      // Lovable AI Gateway fallback when all OpenRouter free models fail
      if (!response?.ok) {
        console.log("All OpenRouter free models failed. Falling back to Lovable AI Gateway.");
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (LOVABLE_API_KEY) {
          const lovableResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: finalMessages,
              stream: true,
            }),
          });
          if (lovableResponse.ok) {
            console.log("Lovable AI Gateway fallback succeeded.");
            response = lovableResponse;
          } else {
            const errText = await lovableResponse.text();
            console.error("Lovable AI Gateway fallback failed:", lovableResponse.status, errText);
          }
        }
      }
    } else {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        response = await fetch(apiUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });
        if (response.status !== 429 || attempt === maxRetries) break;
        const retryAfter = parseInt(response.headers.get("retry-after") || "0", 10);
        const waitMs = Math.max((retryAfter || (attempt + 1) * 2) * 1000, 1000);
        console.log(`Rate limited (429), retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }

    if (!response?.ok) {
      const errorText = lastErrorText || await response?.text?.() || "";

      if (response?.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response?.status === 401) {
        return new Response(JSON.stringify({ error: useGateway ? "Falha ao autenticar no OpenRouter. Atualize a chave configurada em Integrações." : "Chave de API inválida. Verifique sua configuração em Integrações." }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response?.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos na sua conta." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (response?.status === 404 && errorText.includes("No endpoints found")) {
        return new Response(JSON.stringify({ error: "Os modelos gratuitos do OpenRouter ficaram indisponíveis no momento. O assistente tentou alternativas automaticamente. Tente novamente em instantes." }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Surface provider-specific errors (Anthropic/OpenAI BYOK) instead of generic message
      console.error("AI API error:", response?.status, errorText);
      let userFacingError = "Erro no serviço de IA. Tente novamente em instantes.";
      try {
        const parsed = JSON.parse(errorText);
        const providerMsg = parsed?.error?.message || parsed?.error?.msg || parsed?.message || "";
        if (providerMsg) {
          if (providerMsg.includes("credit balance") || providerMsg.includes("billing") || providerMsg.includes("purchase credits")) {
            userFacingError = `Sem créditos na sua conta ${selectedProvider === "anthropic" ? "Anthropic" : selectedProvider === "openai" ? "OpenAI" : selectedProvider}. Recarregue seus créditos no painel do provedor.`;
          } else if (providerMsg.includes("invalid_api_key") || providerMsg.includes("Incorrect API key")) {
            userFacingError = `Chave de API ${selectedProvider} inválida. Verifique em Integrações.`;
          } else if (providerMsg.includes("overloaded") || providerMsg.includes("capacity")) {
            userFacingError = `O serviço ${selectedProvider} está sobrecarregado. Tente novamente em instantes.`;
          } else {
            userFacingError = `Erro do provedor ${selectedProvider}: ${providerMsg.slice(0, 200)}`;
          }
        }
      } catch { /* keep generic */ }

      return new Response(JSON.stringify({ error: userFacingError }), {
        status: response?.status || 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Monthly usage tracking (background, non-blocking) ---
    if (!isPlatformUser && !hasByok && response!.ok) {
      const yearMonth = new Date().toISOString().slice(0, 7);
      const adminClient = createClient(supabaseUrl, serviceKey);

      adminClient.rpc("increment_monthly_usage", {
        p_user_id: user.id,
        p_year_month: yearMonth,
      }).catch((e: unknown) => console.error("Error tracking usage:", e));
    }

    return new Response(response!.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("agent-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
