import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { Loader2, ArrowLeft, Sparkles, Bot, Settings, Plug, Share2, Rocket, Phone, Brain, Monitor, MessageSquare, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ConversationProvider } from "@elevenlabs/react";
import AgentRightPanel, { type AgentConfig } from "@/components/aikortex/AgentRightPanel";
import AgentChatPanel, { type StructuredAgentConfig } from "@/components/aikortex/AgentChatPanel";
import VoiceCallPanel from "@/components/aikortex/VoiceCallPanel";
import OutboundCallDialog from "@/components/aikortex/OutboundCallDialog";
import BrowserCallWidget from "@/components/aikortex/BrowserCallWidget";
import { useAgentChat } from "@/hooks/use-agent-chat";
import { useApiKeys } from "@/hooks/use-api-keys";
import { useUserAgents } from "@/hooks/use-user-agents";
import { toast } from "sonner";
import type { AgentType } from "@/types/agent-builder";
import { supabase } from "@/integrations/supabase/client";
import { AGENT_PRESETS } from "@/types/agent-presets";
import { getOperationalInstructions } from "@/lib/agent-operational-prompts";
import { DEFAULT_FREE_SETUP_MODEL, GATEWAY_MODELS, normalizeFreeSetupModel } from "@/lib/free-setup-models";
import { LLM_MODELS as ALL_LLM_MODELS, getGroupedModels, getProviderForModel, DEFAULT_FREE_MODEL } from "@/lib/llm-models";

import { useAgentMemory } from "@/hooks/use-agent-memory";

import avatar1 from "@/assets/avatars/avatar-1.png";
import avatar2 from "@/assets/avatars/avatar-2.png";
import avatar3 from "@/assets/avatars/avatar-3.png";
import avatar8 from "@/assets/avatars/avatar-8.png";

/* ── Constants ── */

const TEMPLATE_MAP: Record<string, { name: string; avatar: string; model: string; agentType: AgentType; autoPrompt: string }> = {
  "sdr-1": {
    name: "Agente SDR",
    avatar: avatar1,
    model: "google/gemini-2.5-flash",
    agentType: "SDR",
    autoPrompt: `Crie um agente SDR inbound para qualificação de leads via WhatsApp e chat web.

Perfil do agente:
- Nome sugerido: Sofia (pode ser personalizado)
- Tom: profissional e consultivo, sem pressão
- Idioma: português brasileiro

Fluxo de conversa obrigatório:
1. Saudação calorosa e identificação do interesse do lead
2. Coletar: nome completo, empresa, cargo, telefone e email
3. Qualificar com critérios BANT: budget (tamanho da operação), authority (quem decide), need (principal dor), timeline (urgência)
4. Se qualificado: propor agendamento de reunião com o time comercial
5. Se não qualificado agora: registrar contato e agendar follow-up em 30 dias
6. Nunca pressionar. Se o lead pedir para parar, agradecer e encerrar

Regras:
- Fazer no máximo 2 perguntas por mensagem
- Nunca revelar os critérios de qualificação ao lead
- Escalar para humano se o lead demonstrar frustração
- Respostas curtas (máximo 4 linhas)`,
  },

  "sac-1": {
    name: "Agente SAC",
    avatar: avatar3,
    model: "google/gemini-2.5-flash",
    agentType: "SAC",
    autoPrompt: `Crie um agente de atendimento ao cliente (SAC) para suporte via WhatsApp e chat web.

Perfil do agente:
- Nome sugerido: Lia (pode ser personalizado)
- Tom: empático, paciente e resolutivo
- Idioma: português brasileiro

Fluxo de conversa obrigatório:
1. Saudação empática e identificação do cliente (nome + número do pedido ou conta, se aplicável)
2. Entender o problema com clareza — fazer no máximo 2 perguntas de diagnóstico
3. Tentar resolver imediatamente usando a base de conhecimento disponível
4. Se não conseguir resolver: abrir chamado e informar prazo de retorno
5. Confirmar resolução e pedir avaliação (1 a 5 estrelas) ao encerrar

Regras:
- Nunca culpar o cliente
- Nunca prometer prazos que não possa cumprir
- Escalar para humano se: reclamação grave, ameaça de cancelamento, problema técnico complexo
- Respostas curtas e diretas (máximo 4 linhas)
- Usar linguagem simples, sem jargão técnico`,
  },
};

const AVATAR_BY_TYPE: Record<string, string> = {
  SDR: avatar1, SAC: avatar3, Custom: avatar1,
};

const LLM_MODELS = ALL_LLM_MODELS.map(m => ({
  value: m.id,
  label: m.name,
  provider: m.provider,
  badge: (m.byok ? (m.provider === "anthropic" ? "byok-anthropic" : "byok") : "free") as "free" | "byok" | "byok-anthropic",
}));

const STRUCTURE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-structure`;

/* ── Types ── */

interface LoadedAgent {
  name: string;
  avatar: string;
  model: string;
  agentType: AgentType;
  savedConfig: Record<string, any> | null;
}

const buildSavedConfig = (config: AgentConfig, agentType: string) => ({
  name: config.name,
  description: config.description,
  objective: config.objective,
  instructions: config.instructions,
  toneOfVoice: config.toneOfVoice,
  greetingMessage: config.greetingMessage,
  avatarUrl: config.avatarUrl,
  channels: config.channels,
  integrations: config.integrations,
  integrationConfigs: config.integrationConfigs,
  knowledgeFiles: config.knowledgeFiles,
  urls: config.urls,
  apiConfig: config.apiConfig,
  voiceConfig: config.voiceConfig,
  agentType,
});

const mergeAgentInstructions = (agentType: AgentType, ...parts: Array<string | undefined>) => {
  const merged = [getOperationalInstructions(agentType), ...parts]
    .map((part) => part?.trim())
    .filter((part): part is string => !!part)
    .filter((part, index, all) => all.indexOf(part) === index);

  return merged.join("\n\n");
};

/* ── Component ── */

const AgentDetail = () => {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { agentId } = useParams();
  const navState    = location.state as any;

  const isTemplate    = !!agentId && !!TEMPLATE_MAP[agentId];
  const isNewCustomFromHome = navState?.fromTemplate === false && !!navState?.initialPrompt;
  const templateAgent = isTemplate ? TEMPLATE_MAP[agentId!] : null;
  const initialType: AgentType = (navState?.agentType as AgentType) || templateAgent?.agentType || "Custom";

  /* ── Agent loading ── */

  const [loadedAgent, setLoadedAgent] = useState<LoadedAgent>(() => {
    if (templateAgent) {
      // Templates start with neutral name — wizard chat will collect details first
      return { name: "Novo Agente", avatar: templateAgent.avatar, model: templateAgent.model, agentType: templateAgent.agentType, savedConfig: null };
    }
    return { name: "Carregando...", avatar: avatar1, model: "gemini-2.5-flash", agentType: initialType, savedConfig: null };
  });
  const [agentLoading, setAgentLoading] = useState(!isTemplate);

  useEffect(() => {
    if (isTemplate || !agentId || agentId === "new" || agentId.startsWith("new-")) { setAgentLoading(false); return; }
    const load = async () => {
      setAgentLoading(true);
      const { data } = await supabase.from("user_agents").select("*").eq("id", agentId).single();
      if (data) {
        setLoadedAgent({
          name:        data.name,
          avatar:      data.avatar_url || AVATAR_BY_TYPE[data.agent_type] || avatar1,
          model:       data.model || "gemini-2.5-flash",
          agentType:   (data.agent_type as AgentType) || "Custom",
          savedConfig: {
            ...(typeof data.config === "object" && data.config !== null ? data.config : {}),
            name: data.name,
            description: data.description || "",
            avatarUrl: data.avatar_url || AVATAR_BY_TYPE[data.agent_type] || avatar1,
          } as Record<string, any>,
        });
      }
      setAgentLoading(false);
    };
    load();
  }, [agentId, isTemplate]);

  /* ── Wizard state ── */

  // Templates now go through the wizard chat (Q&A) before building
  const [wizardStep, setWizardStep] = useState<"discover" | "structure" | "build" | "done">(() => {
    if (isTemplate) return "discover";
    if (isNewCustomFromHome) return "discover";
    // Existing saved agent
    return "done";
  });
  const [structuredConfig, setStructuredConfig] = useState<StructuredAgentConfig | null>(null);
  const [isStructuring, setIsStructuring] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);

  /* ── Chat mode ── */

  const storagePrefix = `agent-detail-${agentId || "new"}`;
  const shouldPersistTemplateDraft = !isTemplate;

  const [chatMode, setChatMode] = useState<"setup" | "test">(() => {
    if (navState?.chatMode === "test") return "test";
    if (!shouldPersistTemplateDraft) return "setup";
    try { return (localStorage.getItem(`${storagePrefix}-chatMode`) as "setup" | "test") || "setup"; } catch { return "setup"; }
  });

  // Split-screen layout state
  const [searchParams, setSearchParams] = useSearchParams();
  const rightSection = searchParams.get("section") || "config.agent";
  const setRightSection = useCallback((s: string) => {
    setSearchParams((prev) => { const next = new URLSearchParams(prev); next.set("section", s); return next; }, { replace: true });
  }, [setSearchParams]);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [mobileTab, setMobileTab] = useState<"chat" | "config">("chat");

  useEffect(() => {
    if (!shouldPersistTemplateDraft) return;
    try { localStorage.setItem(`${storagePrefix}-chatMode`, chatMode); } catch {}
  }, [chatMode, storagePrefix, shouldPersistTemplateDraft]);

  /* ── Model state ── */

  const [agentModel, setAgentModel] = useState(() => {
    if (!shouldPersistTemplateDraft) return loadedAgent.model;
    try { return localStorage.getItem(`${storagePrefix}-model`) || loadedAgent.model; } catch { return loadedAgent.model; }
  });
  const [setupModel, setSetupModel] = useState<string>(() => {
    if (!shouldPersistTemplateDraft) return DEFAULT_FREE_SETUP_MODEL;
    try { return normalizeFreeSetupModel(localStorage.getItem(`${storagePrefix}-setupModel`)); } catch { return DEFAULT_FREE_SETUP_MODEL; }
  });

  useEffect(() => {
    if (!shouldPersistTemplateDraft) return;
    try { localStorage.setItem(`${storagePrefix}-model`, agentModel); } catch {}
  }, [agentModel, storagePrefix, shouldPersistTemplateDraft]);
  useEffect(() => {
    if (!loadedAgent.model || !shouldPersistTemplateDraft) return;
    setAgentModel((currentModel) => {
      try {
        const storedModel = localStorage.getItem(`${storagePrefix}-model`);
        return storedModel || loadedAgent.model || currentModel;
      } catch {
        return loadedAgent.model || currentModel;
      }
    });
  }, [loadedAgent.model, storagePrefix, shouldPersistTemplateDraft]);
  useEffect(() => {
    if (!shouldPersistTemplateDraft) return;
    try { localStorage.setItem(`${storagePrefix}-setupModel`, setupModel); } catch {}
  }, [setupModel, storagePrefix, shouldPersistTemplateDraft]);

  /* ── API keys ── */

  const { keys, loading: keysLoading, refetch: refetchKeys } = useApiKeys();
  const resolvedAgentId = agentId && !TEMPLATE_MAP[agentId] && agentId !== "new" && !agentId.startsWith("new-") ? agentId : undefined;
  const { isActive: hasMemoryActive } = useAgentMemory(resolvedAgentId);
  const currentProvider = useMemo(() => getProviderForModel(agentModel), [agentModel]);
  // Show all models with locked state based on BYOK + key availability
  const availableModels = useMemo(() => LLM_MODELS.map(m => ({
    ...m,
    locked: m.badge !== "free" && !keys[m.provider]?.configured,
  })), [keys]);
  const hasApiKey    = !!keys[currentProvider]?.configured;
  const hasAnyLLMKey = useMemo(() => ["openai", "anthropic", "gemini", "google", "deepseek", "mistral"].some(p => keys[p]?.configured), [keys]);

  /* ── Agent config (from right panel) ── */

  const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);
  const [wizardMessages, setWizardMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const setupMessagesRef = useRef<any[] | null>(null);
  const testMessagesRef = useRef<any[] | null>(null);
  const [pendingSetupRestore, setPendingSetupRestore] = useState<any[] | null>(null);
  const [pendingTestRestore, setPendingTestRestore] = useState<any[] | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Save agent ── */

  const { saveAgent } = useUserAgents();
  const [isSaving, setIsSaving] = useState(false);
  
  const [showOutboundCall, setShowOutboundCall] = useState(false);
  const [showBrowserCall, setShowBrowserCall] = useState(false);

  const handleSaveAgent = useCallback(async (config: AgentConfig & { model: string; agentType: string }) => {
    setIsSaving(true);
    try {
      const result = await saveAgent({
        id:          agentId && !TEMPLATE_MAP[agentId] && agentId !== "new" && !agentId.startsWith("new-") ? agentId : undefined,
        name:        config.name,
        agent_type:  config.agentType,
        description: config.description,
        avatar_url:  config.avatarUrl,
        model:       config.model,
        provider:    getProviderForModel(config.model),
        status:      "configuring",
        config: {
          objective:       config.objective,
          instructions:    config.instructions,
          toneOfVoice:     config.toneOfVoice,
          greetingMessage: config.greetingMessage,
          channels:        config.channels,
          integrations:    config.integrations,
          integrationConfigs: config.integrationConfigs,
          knowledgeFiles:  config.knowledgeFiles,
          urls:            config.urls,
          apiConfig:       config.apiConfig,
          voiceConfig:     config.voiceConfig,
          wizardStep,
          wizardMessages,
          setupMessages: setupMessagesRef.current || [],
          testMessages: testMessagesRef.current || [],
          setupModel,
          chatMode,
        },
      });
      if (result) {
        setLoadedAgent({
          name: config.name,
          avatar: config.avatarUrl || AVATAR_BY_TYPE[config.agentType] || avatar1,
          model: config.model,
          agentType: (config.agentType as AgentType) || "Custom",
          savedConfig: buildSavedConfig(config, config.agentType),
        });
        setAgentConfig(config);
        if (agentId && TEMPLATE_MAP[agentId] && result.id !== agentId) {
          navigate(`/aikortex/agents/${result.id}`, { replace: true });
        }
      }
    } finally {
      setIsSaving(false);
    }
  }, [agentId, saveAgent, navigate, wizardStep, wizardMessages, setupModel, chatMode]);

  const saveAgentRef = useRef(handleSaveAgent);
  saveAgentRef.current = handleSaveAgent;

  // Use refs for values that change but shouldn't recreate the callback
  const agentModelRef = useRef(agentModel);
  agentModelRef.current = agentModel;
  const agentTypeRef = useRef(loadedAgent.agentType);
  agentTypeRef.current = loadedAgent.agentType;

  const handleConfigChange = useCallback((config: AgentConfig) => {
    setAgentConfig(config);

    // Auto-save with debounce
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      if (config.name?.trim()) {
        saveAgentRef.current({ ...config, model: agentModelRef.current, agentType: agentTypeRef.current });
      }
    }, 1200);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); }, []);

  useEffect(() => {
    const savedDraft = loadedAgent.savedConfig;
    if (!savedDraft || typeof savedDraft !== "object") return;
    if (Array.isArray(savedDraft.wizardMessages)) setWizardMessages(savedDraft.wizardMessages);
    if (Array.isArray(savedDraft.setupMessages) && savedDraft.setupMessages.length > 0) setPendingSetupRestore(savedDraft.setupMessages);
    if (Array.isArray(savedDraft.testMessages) && savedDraft.testMessages.length > 0) setPendingTestRestore(savedDraft.testMessages);
    if (savedDraft.wizardStep && ["discover", "structure", "build", "done"].includes(savedDraft.wizardStep)) {
      setWizardStep(savedDraft.wizardStep);
    }
  }, [loadedAgent.savedConfig]);

  /* ── Wizard: preencher painel direito ── */

  const [presetData, setPresetData] = useState<{
    name?: string; description?: string; objective?: string;
    toneOfVoice?: string; greetingMessage?: string; instructions?: string;
  } | undefined>(undefined);

  const handleConfigStructured = useCallback((config: StructuredAgentConfig) => {
    setPresetData({
      name:            config.agent_name,
      description:     config.description,
      objective:       config.objective,
      toneOfVoice:     config.tone,
      greetingMessage: config.greeting_message,
      instructions:    config.instructions,
    });
  }, []);

  /* ── Wizard: structure request (calls edge function) ── */

  const handleStructureRequest = useCallback(async (description: string): Promise<StructuredAgentConfig | null> => {
    setIsStructuring(true);
    try {
      const resp = await fetch(STRUCTURE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          description,
          agent_type: loadedAgent.agentType,
          language: "pt-BR",
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        toast.error(data.error || "Erro ao estruturar agente");
        return null;
      }

      const data = await resp.json();
      return data.structuredConfig as StructuredAgentConfig;
    } catch (e) {
      console.error("Structure request error:", e);
      toast.error("Erro de conexão ao estruturar agente");
      return null;
    } finally {
      setIsStructuring(false);
    }
  }, [loadedAgent.agentType]);

  /* ── Wizard: build (save agent) ── */

  const handleBuildAgent = useCallback(async (config: StructuredAgentConfig) => {
    setIsBuilding(true);
    const resolvedType = loadedAgent.agentType || "Custom";
    try {
      const result = await saveAgent({
        id:          agentId && !TEMPLATE_MAP[agentId] && agentId !== "new" && !agentId.startsWith("new-") ? agentId : undefined,
        name:        config.agent_name,
        agent_type:  resolvedType,
        description: config.description,
        avatar_url:  AVATAR_BY_TYPE[resolvedType] || avatar1,
        model:       agentModel,
        provider:    getProviderForModel(agentModel),
        status:      "active",
        config: {
          objective:       config.objective,
          instructions:    config.instructions,
          toneOfVoice:     config.tone,
          greetingMessage: config.greeting_message,
          channels:        config.channels,
          integrations:    [],
          integrationConfigs: {},
          knowledgeFiles:  [],
          urls:            [],
        },
      });

      if (result) {
        toast.success(`✅ ${config.agent_name} criado com sucesso!`);
        setLoadedAgent({
          name: config.agent_name,
          avatar: AVATAR_BY_TYPE[resolvedType] || avatar1,
          model: agentModel,
          agentType: resolvedType,
          savedConfig: {
            name: config.agent_name,
            description: config.description,
            objective: config.objective,
            instructions: config.instructions,
            toneOfVoice: config.tone,
            greetingMessage: config.greeting_message,
            avatarUrl: AVATAR_BY_TYPE[resolvedType] || avatar1,
            channels: config.channels,
            integrations: [],
            integrationConfigs: {},
            knowledgeFiles: [],
            urls: [],
          },
        });
        setPresetData({
          name: config.agent_name,
          description: config.description,
          objective: config.objective,
          toneOfVoice: config.tone,
          greetingMessage: config.greeting_message,
          instructions: config.instructions,
        });
        setWizardStep("done");

        if (agentId && TEMPLATE_MAP[agentId] && result.id !== agentId) {
          navigate(`/aikortex/agents/${result.id}`, { replace: true });
        }
      }
    } catch (e) {
      console.error("Build agent error:", e);
      toast.error("Erro ao criar agente");
    } finally {
      setIsBuilding(false);
    }
  }, [agentId, saveAgent, navigate, agentModel, loadedAgent.agentType]);

  /* ── Templates: do NOT preload preset data.
        The wizard chat must collect every detail from the user before the
        agent is built. Right panel stays empty until the assistant produces
        the ```agent-config``` block and the build flow runs. ── */

  /* ── Chat (setup mode — gratuito) ── */

  const setupSystemPrompt = useMemo(() => {
    const configSummary = agentConfig ? [
      agentConfig.name        ? `Nome: ${agentConfig.name}` : null,
      agentConfig.objective   ? `Objetivo: ${agentConfig.objective.slice(0, 150)}` : null,
      agentConfig.toneOfVoice ? `Tom: ${agentConfig.toneOfVoice}` : null,
    ].filter(Boolean).join("\n") : "Nenhuma configuração ainda.";

    return `Você é um assistente especializado em configurar agentes de IA na plataforma Aikortex.
Tipo do agente: ${loadedAgent.agentType}.
Seja BREVE e direto. Faça UMA pergunta por vez (máximo 2 linhas).

ESTADO ATUAL:
${configSummary}

Quando o usuário pedir alterações, oriente sobre o que pode ser ajustado no painel direito.
Quando todas as configurações estiverem completas, sugira usar o modo Testar.
IMPORTANTE: Você NÃO é o agente final. Apenas configure.`;
  }, [agentConfig, loadedAgent.agentType]);

  const setupInitialMessage = useMemo(() => {
    return `Olá! 👋 Sou o assistente de configuração do **${loadedAgent.name}**. O que gostaria de ajustar?`;
  }, [loadedAgent.name]);

  const setupChat = useAgentChat(
    [{ role: "agent", text: setupInitialMessage }],
    {
      useGateway:   true,
      gatewayModel: setupModel,
      systemPrompt: setupSystemPrompt,
      persistKey:   shouldPersistTemplateDraft ? `${storagePrefix}-setup-messages` : undefined,
    }
  );

  useEffect(() => {
    if (pendingSetupRestore?.length) {
      setupChat.setMessages(pendingSetupRestore as any);
      setPendingSetupRestore(null);
    }
  }, [pendingSetupRestore, setupChat.setMessages]);

  /* ── Chat (wizard-setup mode — guided Q&A to fill agent config) ── */

  const wizardAgentTypeKey = (loadedAgent.agentType || "Custom").toLowerCase();

  const wizardSystemPrompt = wizardAgentTypeKey === "sdr"
    ? `Você é um assistente de configuração da plataforma Aikortex. Configure um agente SDR (qualificação de leads).

O usuário já recebeu a primeira pergunta: "Qual é o nome do seu negócio e o que ele faz?" (esta conta como Q1).

Continue com mais 5 perguntas, UMA por vez, nesta ordem:
Q2: Quem é o cliente ideal? (cargo, segmento, tamanho de empresa)
Q3: Qual é o principal diferencial ou proposta de valor?
Q4: Quais são as principais objeções de venda que o agente deve superar?
Q5: Qual tom de comunicação? (consultivo, direto, informal)
Q6: Qual é o principal objetivo do agente? (agendar reunião, qualificar lead, coletar dados)

Regras obrigatórias:
- Faça UMA pergunta por mensagem, máximo 2 linhas.
- Após receber resposta das 6 perguntas (incluindo Q1 já respondida), diga EXATAMENTE: "Perfeito! Vou configurar seu agente agora."
- NÃO faça mais perguntas após a frase de encerramento.
- Responda em português do Brasil.`
    : `Você é um assistente de configuração da plataforma Aikortex. Configure um agente SAC (atendimento ao cliente).

O usuário já recebeu a primeira pergunta: "Qual é o nome do seu negócio e o que ele faz?" (esta conta como Q1).

Continue com mais 3 perguntas, UMA por vez, nesta ordem:
Q2: Quem são os clientes atendidos? (perfil e necessidades)
Q3: Quais são os principais problemas ou reclamações que o agente deve resolver?
Q4: Qual tom de comunicação? (empático, formal, casual)

Regras obrigatórias:
- Faça UMA pergunta por mensagem, máximo 2 linhas.
- Após receber resposta das 4 perguntas (incluindo Q1 já respondida), diga EXATAMENTE: "Perfeito! Vou configurar seu agente agora."
- NÃO faça mais perguntas após a frase de encerramento.
- Responda em português do Brasil.`;

  const wizardChat = useAgentChat(
    [{ role: "agent" as const, text: `Olá! 👋 Vou te ajudar a configurar seu agente ${loadedAgent.agentType}. Para começar: qual é o nome do seu negócio e o que ele faz?` }],
    {
      useGateway: true,
      gatewayModel: setupModel,
      systemPrompt: wizardSystemPrompt,
      persistKey: shouldPersistTemplateDraft ? `${storagePrefix}-wizard-messages` : undefined,
    }
  );

  // Auto-send "start" once when wizard opens (templates AND new custom agents)
  const wizardStartedRef = useRef(false);
  useEffect(() => {
    if (wizardStartedRef.current) return;
    if (agentLoading) return;
    if (wizardStep !== "discover") return;
    if (wizardChat.messages.length > 0) { wizardStartedRef.current = true; return; }
    wizardStartedRef.current = true;
    void wizardChat.sendMessage("start");
  }, [agentLoading, wizardStep, wizardChat]);

  // Safety guard: min user messages before auto-build (closing phrase is the primary trigger)
  const WIZARD_MIN_QUESTIONS: Record<string, number> = {
    sdr: 6, sac: 4,
  };

  const wizardCompletedRef = useRef(false);

  const runWizardBuild = useCallback(async (conversationSummary: string) => {
    if (wizardCompletedRef.current) return;
    wizardCompletedRef.current = true;

    setWizardStep("structure");

    // Try to enrich via agent-structure; fallback to basic config if it fails
    let finalConfig: StructuredAgentConfig;
    const enriched = await handleStructureRequest(conversationSummary);

    if (enriched) {
      finalConfig = enriched;
    } else {
      // Fallback: build basic config from first user answer (agent name)
      const firstUserMsg = wizardChat.messages.find(m => m.role === "user");
      const agentName = firstUserMsg?.text?.trim() || loadedAgent.name || "Novo Agente";
      finalConfig = {
        agent_name: agentName,
        agent_type: loadedAgent.agentType || "Custom",
        description: `Agente ${agentName} configurado via wizard.`,
        objective: conversationSummary.slice(0, 300),
        tone: "professional_friendly",
        language: "pt-BR",
        greeting_message: `Olá! Sou ${agentName}. Como posso ajudar?`,
        instructions: mergeAgentInstructions(loadedAgent.agentType, conversationSummary),
        channels: ["whatsapp", "website"],
        selected_features: [],
        onboarding_level: "soft",
      };
    }

    setStructuredConfig(finalConfig);
    handleConfigStructured(finalConfig);
    setWizardStep("build");
    await handleBuildAgent(finalConfig);
  }, [handleStructureRequest, handleConfigStructured, handleBuildAgent, setWizardStep, wizardChat.messages, loadedAgent]);

  // Auto-advance: trigger when user has answered all required questions
  useEffect(() => {
    if (wizardCompletedRef.current) return;
    if (wizardChat.isStreaming) return;
    if (wizardStep !== "discover") return;

    const minRequired = WIZARD_MIN_QUESTIONS[wizardAgentTypeKey] ?? 6;
    const userMessages = wizardChat.messages.filter(m => m.role === "user");
    if (userMessages.length < minRequired) return;

    // Build a conversation summary from Q&A pairs
    const summary = wizardChat.messages
      .map(m => m.role === "user" ? `Usuário: ${m.text}` : `Assistente: ${m.text}`)
      .join("\n");

    void runWizardBuild(summary);
  }, [wizardChat.messages, wizardChat.isStreaming, wizardStep, wizardAgentTypeKey, runWizardBuild]);

  // Primary trigger: AI says the closing phrase
  useEffect(() => {
    if (wizardCompletedRef.current) return;
    if (wizardChat.isStreaming) return;
    if (wizardStep !== "discover") return;

    const lastAgentMsg = [...wizardChat.messages].reverse().find(m => m.role === "agent");
    if (!lastAgentMsg?.text) return;
    if (!lastAgentMsg.text.includes("Vou configurar seu agente agora")) return;

    const summary = wizardChat.messages
      .map(m => m.role === "user" ? `Usuário: ${m.text}` : `Assistente: ${m.text}`)
      .join("\n");

    void runWizardBuild(summary);
  }, [wizardChat.messages, wizardChat.isStreaming, wizardStep, runWizardBuild]);

  // Fallback: detect explicit ```agent-config``` block if AI generates one
  useEffect(() => {
    if (wizardCompletedRef.current) return;
    if (wizardChat.isStreaming) return;
    if (wizardStep !== "discover") return;

    const lastAgentMsg = [...wizardChat.messages].reverse().find(m => m.role === "agent");
    if (!lastAgentMsg) return;
    const match = lastAgentMsg.text.match(/```agent-config\s*([\s\S]*?)```/);
    if (!match) return;

    try {
      const parsed = JSON.parse(match[1].trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim());
      const brief = [
        parsed.companyName  ? `Empresa: ${parsed.companyName}` : "",
        parsed.description  ? `Descrição: ${parsed.description}` : "",
        parsed.objective    ? `Objetivo: ${parsed.objective}` : "",
        parsed.toneOfVoice  ? `Tom de voz: ${parsed.toneOfVoice}` : "",
        parsed.greetingMessage ? `Saudação: ${parsed.greetingMessage}` : "",
        parsed.instructions ? `Instruções:\n${parsed.instructions}` : "",
      ].filter(Boolean).join("\n\n");

      void runWizardBuild(brief || "Agente configurado via wizard");
    } catch {
      // malformed block — wait for auto-advance by message count
    }
  }, [wizardChat.messages, wizardChat.isStreaming, wizardStep, runWizardBuild]);


  const testSystemPrompt = useMemo(() => {
    const name = agentConfig?.name || loadedAgent.name;
    const parts = [
      `Você é o agente "${name}". Você deve agir EXATAMENTE como este agente em todas as interações.`,
      `\nTipo de agente: ${loadedAgent.agentType}`,
      agentConfig?.description    ? `\nDescrição: ${agentConfig.description}` : "",
      agentConfig?.objective      ? `\nObjetivo: ${agentConfig.objective}` : "",
      agentConfig?.instructions   ? `\nInstruções que você DEVE seguir:\n${agentConfig.instructions}` : "",
      agentConfig?.toneOfVoice    ? `\nTom de voz obrigatório: ${agentConfig.toneOfVoice}` : "",
      agentConfig?.greetingMessage ? `\nSua mensagem de saudação padrão: ${agentConfig.greetingMessage}` : "",
      agentConfig?.channels?.length ? `\nCanais ativos: ${agentConfig.channels.join(", ")}` : "",
      "\n\n## Regras obrigatórias:",
      "- Responda SEMPRE em português brasileiro.",
      "- NUNCA saia do personagem. Você É este agente, não um assistente genérico.",
      "- Mantenha o tom de voz configurado em TODAS as respostas.",
      "- Se não souber algo específico do negócio, diga educadamente que pode encaminhar.",
      "- Seja conciso e direto (máximo 3 parágrafos por resposta).",
    ];
    return parts.filter(Boolean).join("");
  }, [agentConfig, loadedAgent.name, loadedAgent.agentType]);

  const testAgentContext = useMemo(() => {
    if (!agentConfig) return undefined;
    return {
      name: agentConfig.name || loadedAgent.name,
      role: loadedAgent.agentType,
      description: agentConfig.description,
      objective: agentConfig.objective,
      instructions: agentConfig.instructions,
      toneOfVoice: agentConfig.toneOfVoice,
      greetingMessage: agentConfig.greetingMessage,
      channels: agentConfig.channels,
      integrations: agentConfig.integrations,
      knowledgeFiles: agentConfig.knowledgeFiles,
      urls: agentConfig.urls,
    };
  }, [agentConfig, loadedAgent.name, loadedAgent.agentType]);

  const testChat = useAgentChat(
    [{ role: "agent", text: agentConfig?.greetingMessage || `🧪 Modo de Teste ativado! Respondendo como **${loadedAgent.name}**. Envie uma mensagem.` }],
    {
      provider:     currentProvider,
      model:        agentModel,
      systemPrompt: testSystemPrompt,
      persistKey:   shouldPersistTemplateDraft ? `${storagePrefix}-test-messages` : undefined,
      agentContext: testAgentContext,
    }
  );

  useEffect(() => {
    if (pendingTestRestore?.length) {
      testChat.setMessages(pendingTestRestore as any);
      setPendingTestRestore(null);
    }
  }, [pendingTestRestore, testChat.setMessages]);

  // Sync message refs for auto-save (no re-renders)
  useEffect(() => {
    setupMessagesRef.current = setupChat.messages;
  }, [setupChat.messages]);

  useEffect(() => {
    testMessagesRef.current = testChat.messages;
  }, [testChat.messages]);

  const activeChat = chatMode === "setup" ? setupChat : testChat;

  /* ── Limpar localStorage ao abrir template ── */

  useEffect(() => {
    if (!isTemplate || !agentId) return;
    const prefix = `agent-detail-${agentId}`;
    try {
      ["name","desc","objective","instructions","toneOfVoice","greetingMessage",
       "files","urls","channels","apiConfig","avatar","setup-messages","test-messages","chatMode","model","setupModel"].forEach(k =>
        localStorage.removeItem(`${prefix}-${k}`)
      );
    } catch {}
  }, [isTemplate, agentId]);

  /* ── Loading screen ── */

  if (agentLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-sm">Carregando agente...</span>
        </div>
      </div>
    );
  }

  const resolvedAgentIdForPanel = agentId && !TEMPLATE_MAP[agentId] && agentId !== "new" && !agentId.startsWith("new-") ? agentId : undefined;

  const { data: publishState } = useAgentPublishState(resolvedAgentIdForPanel);
  const hasDraftChanges = useMemo(() => {
    if (!publishState) return false;
    if (!publishState.publishedVersionId) return true; // never published → all draft
    return computeAgentDiff(publishState.publishedSnapshot, publishState.currentConfig).length > 0;
  }, [publishState]);

  const handleOpenVoiceCall = useCallback(() => setShowVoiceCall(true), []);
  const handleCloseVoiceCall = useCallback(() => setShowVoiceCall(false), []);
  const handleSwitchToTestChat = useCallback(() => {
    setChatMode("test");
    setMobileTab("chat");
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">

      {/* ── Mobile-only tabs (Chat ↔ Configuração) ── */}
      <div className="lg:hidden flex items-stretch border-b border-border shrink-0">
        <button
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            mobileTab === "chat" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setMobileTab("chat")}
        >
          <MessageSquare className="w-3.5 h-3.5" /> Chat
        </button>
        <button
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            mobileTab === "config" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setMobileTab("config")}
        >
          <Settings2 className="w-3.5 h-3.5" /> Configuração
        </button>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── LEFT: Chat Panel (40% on desktop) ── */}
        <div className={`${mobileTab === "chat" ? "flex" : "hidden"} lg:flex lg:w-[40%] flex-col min-w-0 overflow-hidden`}>
          <AgentChatPanel
            onBack={() => navigate("/aikortex/agents")}
            agentType={loadedAgent.agentType}
            agentName={loadedAgent.name}
            agentAvatar={loadedAgent.avatar}
            wizardStep={wizardStep}
            setWizardStep={setWizardStep}
            structuredConfig={structuredConfig}
            setStructuredConfig={setStructuredConfig}
            chatMode={chatMode}
            setChatMode={setChatMode as any}
            hasApiKey={hasApiKey}
            hasAnyLLMKey={hasAnyLLMKey}
            keysLoading={keysLoading}
            currentProvider={currentProvider}
            agentModel={agentModel}
            availableModels={availableModels as any}
            setupModel={setupModel}
            setSetupModel={setSetupModel}
            setAgentModel={setAgentModel}
            gatewayModels={GATEWAY_MODELS}
            onGoToIntegrations={() => { setRightSection("resources.integrations"); setMobileTab("config"); }}
            onConfigStructured={handleConfigStructured}
            onAgentCreated={handleBuildAgent}
            messages={activeChat.messages}
            sendMessage={activeChat.sendMessage}
            isStreaming={activeChat.isStreaming}
            onStructureRequest={handleStructureRequest}
            onBuildAgent={handleBuildAgent}
            isStructuring={isStructuring}
            isBuilding={isBuilding}
            onOpenConfig={() => setMobileTab("config")}
            initialPrompt={isNewCustomFromHome ? navState?.initialPrompt : undefined}
            initialWizardMessages={wizardMessages}
            onWizardMessagesChange={setWizardMessages}
            hasMemoryActive={hasMemoryActive}
            wizardMessages={wizardChat.messages}
            wizardSendMessage={wizardChat.sendMessage}
            wizardIsStreaming={wizardChat.isStreaming}
          />
        </div>

        {/* ── RIGHT: Persistent configuration (60% on desktop) ── */}
        <div className={`${mobileTab === "config" ? "flex" : "hidden"} lg:flex lg:flex-1 flex-col min-w-0 overflow-hidden border-l border-border`}>
          {/* Top bar — model selector · Testar ligação · Publicar */}
          <div className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card/30">
            <div className="flex items-center gap-2 min-w-0">
              <Bot className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-semibold truncate">{loadedAgent.name}</span>
              <PublishStateBadge state={publishState} hasDraftChanges={hasDraftChanges} />
              {isSaving && (
                <span className="text-[10px] text-muted-foreground animate-pulse ml-2">Salvando...</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 px-2"
                disabled={!keys["elevenlabs"]?.configured}
                onClick={handleOpenVoiceCall}
                title={keys["elevenlabs"]?.configured ? "Testar ligação" : "Configure ElevenLabs em Integrações"}
              >
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Testar ligação</span>
              </Button>
              <PublishButton
                agentId={resolvedAgentIdForPanel}
                disabled={!agentConfig?.name?.trim() || isSaving}
                hasDraftChanges={hasDraftChanges}
                publishedNumber={publishState?.publishedNumber ?? null}
                publishedSnapshot={publishState?.publishedSnapshot ?? null}
                currentConfig={publishState?.currentConfig ?? null}
              />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            <AgentRightPanel
              agent={loadedAgent}
              agentType={loadedAgent.agentType}
              agentId={resolvedAgentIdForPanel}
              agentModel={agentModel}
              onModelChange={setAgentModel}
              section={rightSection}
              onSectionChange={setRightSection}
              onApiKeysChanged={refetchKeys}
              onConfigChange={handleConfigChange}
              onSaveAgent={handleSaveAgent}
              isSaving={isSaving}
              hasAnthropicKey={!!keys["anthropic"]?.configured}
              hasElevenLabsKey={!!keys["elevenlabs"]?.configured}
              onTestCall={handleOpenVoiceCall}
              onSwitchToTestChat={handleSwitchToTestChat}
              storagePrefix={storagePrefix}
              presetData={presetData}
              savedConfig={loadedAgent.savedConfig}
            />
          </div>
        </div>
      </div>

      {/* ── Voice Call Overlay (on-demand) ── */}
      <Sheet open={showVoiceCall} onOpenChange={setShowVoiceCall}>
        <SheetContent side="right" className="w-full sm:w-[480px] sm:max-w-[480px] p-0 border-l border-border flex flex-col">
          <SheetHeader className="px-4 py-3 border-b border-border">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-primary" /> Testar ligação com {loadedAgent.name}
            </SheetTitle>
          </SheetHeader>
          <ConversationProvider>
            <VoiceCallPanel
              agentName={loadedAgent.name}
              agentAvatar={loadedAgent.avatar}
              agentPrompt={agentConfig?.instructions || agentConfig?.objective || ""}
              agentGreeting={agentConfig?.greetingMessage || ""}
              hasElevenLabsKey={!!keys["elevenlabs"]?.configured}
              onGoToIntegrations={() => { handleCloseVoiceCall(); setRightSection("resources.integrations"); setMobileTab("config"); }}
            />
          </ConversationProvider>
        </SheetContent>
      </Sheet>

      {/* Outbound Call Dialog */}
      <OutboundCallDialog
        open={showOutboundCall}
        onOpenChange={setShowOutboundCall}
        agentId={agentId || ""}
        agentName={loadedAgent.name}
        hasTelnyxKey={!!keys["telnyx"]?.configured}
      />

      {/* Browser Call Widget (LiveKit-based) */}
      <BrowserCallWidget
        open={showBrowserCall}
        onClose={() => setShowBrowserCall(false)}
        agentId={agentId || ""}
        agentName={loadedAgent.name}
        agentAvatar={loadedAgent.avatar}
        agentPrompt={agentConfig?.instructions || agentConfig?.objective || ""}
        agentGreeting={agentConfig?.greetingMessage || ""}
        voiceId={agentConfig?.voiceConfig?.voiceId}
      />
    </div>
  );
};

export default AgentDetail;
