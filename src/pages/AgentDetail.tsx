import { fnUrl } from "@/lib/supabase-url";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { Loader2, ArrowLeft, Sparkles, Bot, Settings, Plug, Share2, Rocket, Phone, Brain, Monitor, MessageSquare, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ConversationProvider } from "@elevenlabs/react";
import AgentRightPanel, { type AgentConfig } from "@/components/aikortex/AgentRightPanel";
import AgentChatPanel, { type StructuredAgentConfig } from "@/components/aikortex/AgentChatPanel";
import WizardShowcasePanel from "@/components/aikortex/WizardShowcasePanel";
import { computeWizardProgress } from "@/lib/wizard-progress";
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
import { useAgentPublishState } from "@/hooks/use-agent-versions";
import { computeAgentDiff } from "@/lib/agent-diff";
import PublishAgentDialog from "@/components/aikortex/PublishAgentDialog";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import avatar1 from "@/assets/avatars/avatar-1.png";
import avatar2 from "@/assets/avatars/avatar-2.png";
import avatar3 from "@/assets/avatars/avatar-3.png";
import avatar8 from "@/assets/avatars/avatar-8.png";
// Master v7.4: ícone Aikortex é o avatar PADRÃO de todo agente.
// Path estável em /public/ pra que valores salvos no DB sobrevivam entre builds
// (assets importados via ESM têm hash que muda — não persistir no DB).
const aikortexAvatar = "/aikortex-icon.png";

/* ── Module-level cache pra blindar criação de draft contra Strict Mode
   unmount/remount. Quando mount #1 inicia o async, salva a Promise<id> aqui;
   mount #2 detecta promise existente e aguarda em vez de criar segundo row. */
const pendingDraftCreation = new Map<string, Promise<string | null>>();

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

// Master v7.4: avatar default = ícone Aikortex pra TODOS os tipos.
// Mantemos a estrutura pra futura customização (templates podem trazer
// avatares humanos próprios), mas o padrão é o brand do Aikortex.
const AVATAR_BY_TYPE: Record<string, string> = {
  SDR: aikortexAvatar, SAC: aikortexAvatar, Custom: aikortexAvatar,
};

const LLM_MODELS = ALL_LLM_MODELS.map(m => ({
  value: m.id,
  label: m.name,
  provider: m.provider,
  badge: (m.byok ? (m.provider === "anthropic" ? "byok-anthropic" : "byok") : "free") as "free" | "byok" | "byok-anthropic",
}));

const STRUCTURE_URL = fnUrl("agent-structure");

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

/* ── Inline helpers: publish badge + button ── */

function PublishStateBadge({ state, hasDraftChanges }: { state: any; hasDraftChanges: boolean }) {
  if (!state) return null;
  if (!state.publishedVersionId) {
    return <Badge variant="secondary" className="text-[10px] ml-1">Rascunho</Badge>;
  }
  if (!hasDraftChanges) {
    return <Badge variant="outline" className="text-[10px] ml-1 border-emerald-500/40 text-emerald-600 dark:text-emerald-400">Publicado · v{state.publishedNumber}</Badge>;
  }
  const since = state.draftUpdatedAt ? formatDistanceToNow(new Date(state.draftUpdatedAt), { addSuffix: true, locale: ptBR }) : "agora";
  return <Badge className="text-[10px] ml-1 bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20">Rascunho · {since}</Badge>;
}

function PublishButton({
  agentId, disabled, hasDraftChanges, publishedNumber, publishedSnapshot, currentConfig,
}: {
  agentId?: string; disabled: boolean; hasDraftChanges: boolean;
  publishedNumber: number | null; publishedSnapshot: Record<string, any> | null; currentConfig: Record<string, any> | null;
}) {
  const [open, setOpen] = useState(false);
  const nothingToPublish = publishedNumber !== null && !hasDraftChanges;
  const nextNumber = (publishedNumber ?? 0) + 1;
  const label = publishedNumber === null ? "Publicar" : (nothingToPublish ? `Publicado · v${publishedNumber}` : "Publicar alterações");

  return (
    <>
      <Button
        size="sm"
        variant={nothingToPublish ? "outline" : "default"}
        className="h-7 text-xs gap-1 px-2"
        disabled={disabled || nothingToPublish || !agentId}
        onClick={() => setOpen(true)}
        title={nothingToPublish ? "Sem alterações para publicar" : undefined}
      >
        <Rocket className="w-3.5 h-3.5" />
        <span className="hidden lg:inline">{label}</span>
      </Button>
      {agentId && (
        <PublishAgentDialog
          open={open}
          onOpenChange={setOpen}
          agentId={agentId}
          nextVersionNumber={nextNumber}
          publishedSnapshot={publishedSnapshot}
          currentConfig={currentConfig}
        />
      )}
    </>
  );
}

/* ── Component ── */

const AgentDetail = () => {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { agentId } = useParams();
  const navState    = location.state as any;

  const isTemplate    = !!agentId && !!TEMPLATE_MAP[agentId];
  const isNewCustomFromHome = navState?.fromTemplate === false && !!navState?.initialPrompt;
  const isFreshNew = !isTemplate && (!agentId || agentId === "new" || agentId.startsWith("new-"));
  const templateAgent = isTemplate ? TEMPLATE_MAP[agentId!] : null;
  const initialType: AgentType = (navState?.agentType as AgentType) || templateAgent?.agentType || "Custom";

  /* ── Agent loading ── */

  const [loadedAgent, setLoadedAgent] = useState<LoadedAgent>(() => {
    if (templateAgent) {
      // Templates start with neutral name — wizard chat will collect details first
      return { name: "Novo Agente", avatar: templateAgent.avatar, model: templateAgent.model, agentType: templateAgent.agentType, savedConfig: null };
    }
    // Fresh new agent (no DB record yet) → show "Novo Agente" instead of "Carregando..."
    const initialName = isFreshNew ? "Novo Agente" : "Carregando...";
    return { name: initialName, avatar: aikortexAvatar, model: DEFAULT_FREE_MODEL, agentType: initialType, savedConfig: null };
  });
  const [agentLoading, setAgentLoading] = useState(!isTemplate && !isFreshNew);

  useEffect(() => {
    if (isTemplate) { setAgentLoading(false); return; }

    // Master v7.4 §13.16: Modo Vibe Acting precisa do draft existindo no DB
    // ANTES do wizard começar pra agent-vibe-mutate poder aplicar mutations.
    // Pra IDs new-*, cria draft imediatamente e redireciona pra URL real.
    if (!agentId || agentId === "new" || agentId.startsWith("new-")) {
      setAgentLoading(false);

      // Chave única deste fluxo de criação. Usa o agentId placeholder
      // (ex: "new-1234567890") pra distinguir cliques separados em "Novo Agente".
      const flowKey = agentId || "new";

      // Strict Mode pode unmount/remount o componente, perdendo useRef state.
      // Mas variável module-level sobrevive: se mount #1 já registrou a Promise,
      // mount #2 pega ela e navega pro mesmo ID em vez de criar segundo row.
      const cached = pendingDraftCreation.get(flowKey);
      if (cached) {
        cached.then((realId) => {
          if (realId) navigate(`/aikortex/agents/${realId}`, { replace: true, state: location.state });
        });
        return;
      }

      const createPromise = (async (): Promise<string | null> => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return null;

          const { data: created, error } = await supabase
            .from("user_agents")
            .insert({
              user_id: user.id,
              name: "Novo Agente",
              agent_type: initialType || "Custom",
              description: "",
              avatar_url: aikortexAvatar, // brand padrão; user pode trocar depois
              model: DEFAULT_FREE_MODEL,
              provider: "auto",
              status: "configuring",
              config: { wizard_started_at: new Date().toISOString() },
            })
            .select("id")
            .single();
          if (error || !created) {
            console.error("Failed to auto-create draft agent:", error);
            return null;
          }
          return created.id;
        } catch (e) {
          console.error("auto-create draft exception:", e);
          return null;
        }
      })();

      pendingDraftCreation.set(flowKey, createPromise);

      createPromise.then((realId) => {
        if (realId) {
          navigate(`/aikortex/agents/${realId}`, { replace: true, state: location.state });
        }
        // Libera cache depois de 10s pra evitar memory leak. Tempo suficiente
        // pra todos os mounts da mesma sessão de Strict Mode terem sido cobertos.
        setTimeout(() => pendingDraftCreation.delete(flowKey), 10000);
      });
      return;
    }

    const load = async () => {
      setAgentLoading(true);
      const { data } = await supabase.from("user_agents").select("*").eq("id", agentId).single();
      if (data) {
        setLoadedAgent({
          name:        data.name,
          avatar:      data.avatar_url || AVATAR_BY_TYPE[data.agent_type] || aikortexAvatar,
          model:       data.model || "gemini-2.5-flash",
          agentType:   (data.agent_type as AgentType) || "Custom",
          savedConfig: {
            ...(typeof data.config === "object" && data.config !== null ? data.config : {}),
            name: data.name,
            description: data.description || "",
            avatarUrl: data.avatar_url || AVATAR_BY_TYPE[data.agent_type] || aikortexAvatar,
          } as Record<string, any>,
        });

        // Master v7.4 §13.16: detecta wizard em andamento DIRETAMENTE no load
        // (não via useEffect derivado pra evitar race com outros effects).
        // Se started_at existe e wizard_completed é falso, continua o discover.
        const cfg = (data.config as any) ?? {};
        if (cfg.wizard_started_at && !cfg.wizard_completed) {
          setWizardStep("discover");
        }
      }
      setAgentLoading(false);
    };
    load();
  }, [agentId, isTemplate, initialType, navigate, location.state]);

  /* ── Wizard state ── */

  // Templates now go through the wizard chat (Q&A) before building
  const [wizardStep, setWizardStep] = useState<"discover" | "structure" | "build" | "done">(() => {
    if (isTemplate) return "discover";
    if (isNewCustomFromHome) return "discover";
    if (isFreshNew) return "discover";
    // Existing saved agent
    return "done";
  });

  // Master v7.4 §13.16: depois que loadedAgent carrega, detecta se o wizard
  // ainda estava em andamento (config.wizard_started_at sem wizard_completed)
  // e força wizardStep="discover" pra continuar a configuração de onde parou.
  // Sem isso, voltar pro agente recém-criado pula direto pra "done" e some
  // o chat do wizard.
  useEffect(() => {
    const cfg = loadedAgent.savedConfig as any;
    if (!cfg) return;
    const wizardStarted = !!cfg.wizard_started_at;
    const wizardCompleted = !!cfg.wizard_completed;
    if (wizardStarted && !wizardCompleted && wizardStep !== "discover") {
      setWizardStep("discover");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedAgent.savedConfig]);

  // Master v7.4 §13.4 + §15.2: nicho do agente contextualiza o wizard.
  // Quando nulo, primeira pergunta do backend identifica o nicho.
  const [wizardNiche, setWizardNiche] = useState<string | null>(null);

  // Toggle independente do step pra mostrar/esconder painel direito durante
  // discover (UX request: chat full-width por padrão, mas user pode espiar
  // a configuração sendo construída em tempo real pelas tools do wizard).
  const [showConfigDuringDiscover, setShowConfigDuringDiscover] = useState(false);
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
          // BUG fix: campos vindos do painel que estavam sendo OMITIDOS aqui.
          // Sem isso, qualquer auto-save do AgentDetail apagava capabilities
          // (toggles Raciocínio) e guardrails (Limites) que o wizard salvou.
          capabilities:    config.capabilities,
          guardrails:      config.guardrails,
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
          avatar: config.avatarUrl || AVATAR_BY_TYPE[config.agentType] || aikortexAvatar,
          model: config.model,
          agentType: (config.agentType as AgentType) || "Custom",
          savedConfig: buildSavedConfig(config, config.agentType),
        });
        setAgentConfig(config);
        // Promote placeholder route (new-* / template) to real UUID after first INSERT.
        // Migrate localStorage keys so wizard chat history etc. survive the URL change.
        const isPlaceholder = !agentId || agentId === "new" || agentId.startsWith("new-") || !!TEMPLATE_MAP[agentId];
        if (isPlaceholder && result.id && result.id !== agentId) {
          try {
            const oldPrefix = `agent-detail-${agentId || "new"}`;
            const newPrefix = `agent-detail-${result.id}`;
            const suffixes = ["-setup-messages", "-wizard-messages", "-test-messages", "-chatMode", "-model", "-setupModel"];
            for (const s of suffixes) {
              const v = localStorage.getItem(oldPrefix + s);
              if (v != null) {
                localStorage.setItem(newPrefix + s, v);
                localStorage.removeItem(oldPrefix + s);
              }
            }
          } catch {}
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

  // Ref pra ler wizardStep dentro do timer (evita stale closure).
  const wizardStepRef = useRef(wizardStep);
  wizardStepRef.current = wizardStep;

  const handleConfigChange = useCallback((config: AgentConfig) => {
    setAgentConfig(config);

    // Auto-save with debounce
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      // Master v7.4 §13.16: durante discover, o wizard mutaciona via tools
      // (agent-vibe-mutate). Auto-save do painel direito daqui criaria
      // segundo INSERT competindo com o auto-create draft → 2 agentes.
      // Pula auto-save no discover; quando passar pra structure/done,
      // os edits manuais do user voltam a auto-salvar normalmente.
      if (wizardStepRef.current === "discover") return;
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
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`,
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
        avatar_url:  AVATAR_BY_TYPE[resolvedType] || aikortexAvatar,
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
          avatar: AVATAR_BY_TYPE[resolvedType] || aikortexAvatar,
          model: agentModel,
          agentType: resolvedType,
          savedConfig: {
            name: config.agent_name,
            description: config.description,
            objective: config.objective,
            instructions: config.instructions,
            toneOfVoice: config.tone,
            greetingMessage: config.greeting_message,
            avatarUrl: AVATAR_BY_TYPE[resolvedType] || aikortexAvatar,
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

    return `Você é um assistente especializado em configurar agentes de IA na plataforma Aikortex (Modo Setup).

# 🎯 SEU PAPEL
Você ajuda a agência a AJUSTAR e CONFIGURAR o agente já criado pelo Modo Vibe. Você NÃO é o agente final em produção. Você é o "construtor" que conversa com a agência sobre configurações.

# 🤖 AGENTE ATUAL
Tipo: ${loadedAgent.agentType}
${configSummary}

# 📌 REGRAS DE RESPOSTA

## ✅ SEMPRE
1. **Responda DIRETAMENTE ao que o user pediu.** Se ele disse "Crie a tabela de clientes", você fala sobre TABELAS, não sobre Conhecimento ou outra coisa.
2. **Seja BREVE** (2-4 linhas, no máximo 1 pergunta por resposta).
3. **Use sempre português do Brasil.**

## ❌ NUNCA
1. **Mude de assunto** — se user pediu X, fale de X.
2. **Diga que CRIOU/SALVOU/ATIVOU algo sem ter ferramenta pra fazer.** Você NÃO tem tools de criar tabela, conectar OAuth, mexer no banco. Você só ORIENTA.
3. **Invente resposta.** Se não sabe, diga "não tenho certeza, confirma no painel à direita".

# 📚 PLAYBOOK DE RESPOSTAS

Quando o user pedir/dizer X, responda assim:

| User pediu | Sua resposta |
|---|---|
| "Crie a tabela de **X**" | "Tabelas pertencem a um **cliente**. Esse agente está em modo rascunho/personalizado, então ainda não conecta a tabela. Pra criar: vai em **Capacidades → Tabelas** ou atribui esse agente a um cliente no painel." |
| "Conecte com Y" (Google/HubSpot/etc) | "Pra conectar **Y**, vai em **Integrações → Conectores** no painel à direita. Cada provedor tem o próprio botão de autenticação." |
| "Mude o nome pra Z" | "Boa. Vai em **Agente → Nome do agente** e troca pra Z. Ou eu posso te mostrar como fazer rápido." |
| "Adiciona Instagram" | "Pra ativar Instagram, marca em **Canais → Instagram**. Importante: depende da integração estar disponível no roadmap." |
| "Conecta chave LLM" | "Vai em **Integrações → LLMs**. Cola sua chave da OpenAI/Anthropic/Gemini lá. Sem chave real, o agente roda em modo teste com modelo Aikortex." |
| "Adiciona FAQ/documento" | "Vai em **Capacidades → Conhecimento**. Dá upload do PDF/link/texto. O agente passa a usar isso pras respostas." |
| "Cria cadência" | "Em **Automações → Cadências**. Cada cadência é uma sequência temporal (D+1, D+3, D+7) de mensagens automáticas." |
| "Quero testar" | "Boa! Clica no botão **Testar** no topo. Você conversa como se fosse um cliente real." |
| "Quero publicar" | "Clica em **Publicar** no canto superior direito. Antes disso, confere a aba **Visão geral** pra ver se tudo está pronto." |

# ⚠️ CASOS QUE BLOQUEIAM PUBLICAÇÃO
- Sem chave LLM real (só Aikortex/auto)
- Sem nome
- Sem objetivo
- Instruções muito curtas (<100 chars)

Se user falar de algum desses, diga claramente o que falta.

# 🚫 IMPORTANTE
- Você é o CONSTRUTOR conversando com a AGÊNCIA. Não é cliente final.
- Quando user disser "ajuda" sem contexto, ofereça opções específicas: "Quer ajustar nome? Tom? Canais? Conhecimento?".
- Sempre que sugerir um caminho no painel, use formato **Seção → Subseção** em negrito.`;
  }, [agentConfig, loadedAgent.agentType]);

  const setupInitialMessage = useMemo(() => {
    return `🎉 Pronto! **${loadedAgent.name}** está criado e pronto pra uso.\n\nPra refinar o agente, você tem duas opções:\n\n- ✏️ **Edita direto nos campos** do painel à direita (nome, instruções, canais, etc.)\n- 💬 **Ou me diz aqui o que mudar** — ex: *"muda o nome pra Sofia"*, *"adiciona Instagram como canal"*, *"deixa o tom mais formal"*\n\nO que quer ajustar?`;
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

  // Placeholder do ref — useEffect que usa wizardChat foi MOVIDO pra
  // depois da declaração de wizardChat (evita ReferenceError de TDZ).
  const setupGreetingInjectedRef = useRef(false);

  /* ── Chat (wizard-setup mode — guided Q&A to fill agent config) ── */

  const wizardAgentTypeKey = (loadedAgent.agentType || "Custom").toLowerCase();

  // Master v7.4 §13.2 + §13.4: system prompt do wizard é montado no backend
  // (app-chat → buildWizardSystemPrompt) com contextualização por nicho.
  // Frontend só passa agentType + niche; o prompt canônico fica server-side
  // pra garantir consistência entre §13.2 (perfil/integrações/critérios/fluxo).
  const wizardChat = useAgentChat(
    [{
      role: "agent" as const,
      // Master v7.4 §13.2 — Modo Vibe ONE-SHOT. Saudação rotaciona pra dar
      // variedade a quem entra várias vezes; cada variação é direta + 1 exemplo.
      text: (() => {
        const greetings = [
          `👋 O que seu agente precisa fazer?\n\n*Ex:* "SDR pra clínica odontológica que qualifica leads via WhatsApp."`,
          `👋 Qual agente vamos criar hoje?\n\n*Ex:* "SAC pra e-commerce que resolve dúvidas e escala pra humano quando precisa."`,
          `👋 Me descreve seu agente em uma frase.\n\n*Ex:* "Criador de posts pra Instagram de petshop com tom casual."`,
          `👋 Qual é a missão do agente?\n\n*Ex:* "BDR pra prospectar SaaS B2B e agendar reuniões qualificadas."`,
          `👋 O que esse agente vai resolver?\n\n*Ex:* "Atendimento imobiliário via WhatsApp que tira dúvidas e marca visitas."`,
          `👋 Conta em uma frase o que ele faz.\n\n*Ex:* "CS que faz health check semanal e previne churn."`,
          `👋 Pronto pra criar? Me descreve o agente.\n\n*Ex:* "Assistente jurídico que responde dúvidas trabalhistas básicas."`,
          `👋 Qual agente quer montar?\n\n*Ex:* "Recepcionista de restaurante que reserva mesas via WhatsApp."`,
          `👋 Em uma frase, o que esse agente faz?\n\n*Ex:* "Gestor financeiro que organiza boletos e envia lembretes de vencimento."`,
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
      })(),
    }],
    {
      useGateway: true,
      gatewayModel: setupModel,
      mode: "wizard-setup",
      agentType: wizardAgentTypeKey,
      niche: wizardNiche || undefined,
      // Master v7.4 §13.16: Modo Vibe Acting precisa do agentId pra agent-vibe-mutate
      // poder atualizar o draft em tempo real.
      agentContext: agentId ? { agentId, name: loadedAgent?.name ?? "" } : undefined,
      disableCrmExtraction: true,
      persistKey: shouldPersistTemplateDraft ? `${storagePrefix}-wizard-messages` : undefined,
      // G6 — flag opcional pra modo consultivo. Liga via localStorage:
      // localStorage.setItem("aikortex_wizard_consultive", "1")
      // Default desligado (comportamento atual idêntico).
      consultive: (typeof window !== "undefined" && window.localStorage?.getItem("aikortex_wizard_consultive") === "1") || undefined,
    }
  );

  // Quando o wizard transita pra "done", preserva a MENSAGEM RICA do wizard
  // (com warnings + próximos passos + convite) como entrada do setupChat,
  // em vez de descartar e mostrar saudação genérica. User não perde contexto.
  // IMPORTANTE: este effect TEM QUE estar APÓS a declaração de wizardChat
  // (TDZ — const não é hoisted). Antes estava ANTES e quebrava com tela preta.
  useEffect(() => {
    if (wizardStep !== "done") return;
    if (setupGreetingInjectedRef.current) return;
    if (!loadedAgent.name || loadedAgent.name === "Novo Agente" || loadedAgent.name === "Carregando...") return;
    setupGreetingInjectedRef.current = true;

    let lastWizardText = "";
    const wizMsgs = wizardChat.messages || [];
    for (let i = wizMsgs.length - 1; i >= 0; i--) {
      const m = wizMsgs[i] as any;
      if (m.role === "agent" && m.text) {
        lastWizardText = String(m.text).replace(/\n*<!--tools:\[[\s\S]*?\]-->/g, "").trim();
        break;
      }
    }

    // GUIDANCE DETERMINÍSTICA: se o LLM esqueceu de mencionar passos críticos,
    // append fixa pra garantir que user sempre vê (LLM Qwen 3 às vezes pula).
    const mentionsLLMs = /Integraç(ões|ão)\s*→\s*LLMs|Aikortex.*LLM|chave LLM/i.test(lastWizardText);
    const mentionsKB = /Conhecimento|Knowledge|FAQ.*Conhec/i.test(lastWizardText);
    const mentionsTables = /Tabela|Tables\b/i.test(lastWizardText);
    const mentionsCadences = /Cadência|Cadências|Automaç(ões|ão)/i.test(lastWizardText);

    // Exemplos de tabela por nicho — contextualiza a sugestão pra parecer
    // pensada pro agente real, não copy-paste de saúde.
    const niche = (loadedAgent.savedConfig as any)?.businessContext?.niche as string | undefined;
    const tableExamplesByNiche: Record<string, string> = {
      "Saúde":         "pacientes, agendamentos, planos de saúde",
      "Odontologia":   "pacientes, procedimentos, agendamentos",
      "Veterinária":   "tutores, pets, vacinas, agendamentos",
      "Contabilidade": "clientes, regimes tributários, prazos de impostos",
      "Advocacia":     "clientes, processos, prazos, audiências",
      "Imobiliária":   "imóveis, leads, contratos, comissões",
      "Retail":        "produtos, pedidos, estoque, fretes",
      "Food":          "cardápio, pedidos, mesas, ingredientes",
      "Educação":      "alunos, turmas, materiais, mensalidades",
      "Pet":           "tutores, pets, produtos, agendamentos",
      "Estética":      "clientes, procedimentos, agendamentos",
      "Seguros":       "segurados, apólices, sinistros, comissões",
      "SaaS":          "clientes, planos, assinaturas, tickets",
    };
    const tableExamples = (niche && tableExamplesByNiche[niche]) || "clientes, produtos, agendamentos";

    const missing: string[] = [];
    if (!mentionsLLMs) missing.push("- ⚠️ Pra **publicar**, conecte sua chave LLM (OpenAI/Anthropic/Gemini) em **Integrações → LLMs**. O modelo Aikortex é só pra criação/testes.");
    if (!mentionsKB) missing.push("- 📚 Adicione FAQ, políticas e documentos da empresa em **Conhecimento** pra respostas mais precisas.");
    if (!mentionsTables) missing.push(`- 🗃️ Cadastre dados (${tableExamples}) em **Tabelas** pro agente consultar/atualizar.`);
    if (!mentionsCadences) missing.push("- ⏱️ Pra lembretes automáticos e follow-ups, configure em **Automações → Cadências**.");

    let finalMessage = lastWizardText || setupInitialMessage;
    if (missing.length > 0) {
      finalMessage += `\n\n**Próximos passos importantes:**\n${missing.join("\n")}`;
    }

    const cur = setupChat.messages;
    if (cur.length <= 1) {
      setupChat.setMessages([{ role: "agent", text: finalMessage }] as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wizardStep, loadedAgent.name, wizardChat.messages]);

  // Master v7.4 §13.3: painel direito reflete configuração em tempo real.
  // Polling refresca o loadedAgent enquanto wizard ativa tools no draft.
  // Rápido (1s) durante streaming pro thinking card refletir cada tool
  // que dispara; mais lento (3s) quando inativo pra economizar.
  useEffect(() => {
    if (!agentId || agentId === "new" || agentId.startsWith("new-")) return;
    if (wizardStep !== "discover") return;
    const intervalMs = wizardChat.isStreaming ? 1000 : 3000;
    const interval = setInterval(async () => {
      const { data } = await supabase.from("user_agents").select("name, description, agent_type, model, config, avatar_url").eq("id", agentId).maybeSingle();
      if (!data) return;
      setLoadedAgent((prev) => {
        const next = {
          ...prev,
          name: data.name || prev.name,
          model: data.model || prev.model,
          agentType: (data.agent_type as AgentType) || prev.agentType,
          avatar: data.avatar_url || prev.avatar,
          savedConfig: {
            ...(typeof data.config === "object" && data.config !== null ? data.config : {}),
            name: data.name,
            description: data.description || "",
            avatarUrl: data.avatar_url || prev.avatar,
            agentType: data.agent_type, // expõe pro thinking card detectar set_agent_type
          } as Record<string, any>,
        };
        // Se nicho foi setado pelo wizard, sincroniza estado local
        const inferredNiche = (data.config as any)?.businessContext?.niche;
        if (inferredNiche && !wizardNiche) setWizardNiche(inferredNiche);
        return next;
      });
    }, intervalMs);
    return () => clearInterval(interval);
  }, [agentId, wizardStep, wizardNiche, wizardChat.isStreaming]);

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

  const wizardCompletedRef = useRef(false);

  // Fast-track ONE-SHOT: quando wizard chamou commit_draft com tudo configurado,
  // pula structure/build (LLM extra desnecessário) e vai direto pra "done".
  // Master v7.4 §13.2: agente já está montado no DB via tools; só transita estado.
  // FALLBACK DETERMINÍSTICO: garante reasoning ON mesmo se LLM esqueceu de
  // chamar set_capability(reasoning). Outras capabilities por propósito.
  const fastTrackComplete = useCallback(async () => {
    if (wizardCompletedRef.current) return;
    wizardCompletedRef.current = true;

    // Transição imediata pra "done"
    setWizardStep("done");

    if (agentId && agentId !== "new" && !agentId.startsWith("new-")) {
      try {
        // Lê estado atual pra garantir reasoning ON
        const { data: current } = await supabase
          .from("user_agents")
          .select("config")
          .eq("id", agentId)
          .single();

        const currentConfig = (current?.config as any) || {};
        const currentCaps = currentConfig.capabilities || {};
        const reasoningOn = currentCaps.reasoning === true || currentCaps.reasoning?.enabled === true;

        const patchedConfig = reasoningOn ? currentConfig : {
          ...currentConfig,
          capabilities: {
            ...currentCaps,
            reasoning: { enabled: true },
          },
        };

        const { data } = await supabase
          .from("user_agents")
          .update({ status: "active", config: patchedConfig })
          .eq("id", agentId)
          .select("*")
          .single();

        if (data) {
          setLoadedAgent((prev) => ({
            ...prev,
            name: data.name || prev.name,
            model: data.model || prev.model,
            agentType: (data.agent_type as AgentType) || prev.agentType,
            avatar: data.avatar_url || prev.avatar,
            savedConfig: {
              ...(typeof data.config === "object" && data.config !== null ? data.config : {}),
              name: data.name,
              description: data.description || "",
              avatarUrl: data.avatar_url || prev.avatar,
              agentType: data.agent_type,
            } as Record<string, any>,
          }));
        }
      } catch (e) {
        console.warn("[wizard] fast-track refresh failed:", e);
      }
    }
  }, [agentId]);

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

  // Auto-advance — só dispara se a checklist §13.2 tem coverage real.
  // Aceita commit_draft (sinal explícito do wizard) mas EXIGE ≥6/8 blocos
  // preenchidos. Caso o LLM chame commit_draft no meio do fluxo, ignora.
  // Sem commit_draft: só pula se ≥7/8 (quase tudo) — segurança contra
  // wizard travado por algum bug.
  useEffect(() => {
    if (wizardCompletedRef.current) return;
    if (wizardChat.isStreaming) return;
    if (wizardStep !== "discover") return;

    const commitFired = wizardChat.messages.some((m: any) => {
      const txt = (m.text || m.content || "") as string;
      return /<!--tools:[^>]*commit_draft/.test(txt);
    });
    const { doneCount, totalCount } = computeWizardProgress(loadedAgent.savedConfig);

    const enoughForCommit = doneCount >= 6;
    const everythingDone = doneCount >= totalCount - 1; // ≥7/8

    const shouldBuild = (commitFired && enoughForCommit) || everythingDone;
    if (!shouldBuild) return;

    // ONE-SHOT path: se commit_draft veio, agente já está montado via tools.
    // Pula structure/build (LLM extra) e fast-track direto pra "done".
    if (commitFired) {
      void fastTrackComplete();
      return;
    }

    // Fallback (sem commit_draft mas tudo preenchido): build tradicional
    const summary = wizardChat.messages
      .map(m => m.role === "user" ? `Usuário: ${m.text}` : `Assistente: ${m.text}`)
      .join("\n");

    void runWizardBuild(summary);
  }, [wizardChat.messages, wizardChat.isStreaming, wizardStep, loadedAgent.savedConfig, runWizardBuild, fastTrackComplete]);

  // Primary trigger: AI says the closing phrase (com guard de checkpoints)
  useEffect(() => {
    if (wizardCompletedRef.current) return;
    if (wizardChat.isStreaming) return;
    if (wizardStep !== "discover") return;

    const lastAgentMsg = [...wizardChat.messages].reverse().find(m => m.role === "agent");
    if (!lastAgentMsg?.text) return;
    if (!lastAgentMsg.text.includes("Vou configurar seu agente agora")) return;

    // Guard: só dispara se ≥6/8 blocos preenchidos — evita LLM saindo
    // do script e fechando o wizard sem ter coberto §13.2 inteiro.
    const { doneCount } = computeWizardProgress(loadedAgent.savedConfig);
    if (doneCount < 6) return;

    const summary = wizardChat.messages
      .map(m => m.role === "user" ? `Usuário: ${m.text}` : `Assistente: ${m.text}`)
      .join("\n");

    void runWizardBuild(summary);
  }, [wizardChat.messages, wizardChat.isStreaming, wizardStep, loadedAgent.savedConfig, runWizardBuild]);

  // Fallback: detect explicit ```agent-config``` block if AI generates one
  useEffect(() => {
    if (wizardCompletedRef.current) return;
    if (wizardChat.isStreaming) return;
    if (wizardStep !== "discover") return;

    const lastAgentMsg = [...wizardChat.messages].reverse().find(m => m.role === "agent");
    if (!lastAgentMsg) return;
    const match = lastAgentMsg.text.match(/```agent-config\s*([\s\S]*?)```/);
    if (!match) return;

    // Guard: só dispara se ≥6/8 blocos preenchidos
    const { doneCount } = computeWizardProgress(loadedAgent.savedConfig);
    if (doneCount < 6) return;

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
  }, [wizardChat.messages, wizardChat.isStreaming, wizardStep, loadedAgent.savedConfig, runWizardBuild]);


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

  const resolvedAgentIdForPanel = agentId && !TEMPLATE_MAP[agentId] && agentId !== "new" && !agentId.startsWith("new-") ? agentId : undefined;

  const testAgentContext = useMemo(() => {
    if (!agentConfig) return undefined;
    return {
      agentId: resolvedAgentIdForPanel,
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
  }, [agentConfig, loadedAgent.name, loadedAgent.agentType, resolvedAgentIdForPanel]);

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

      <div className="flex flex-1 min-h-0 overflow-hidden relative">

        {/* Layout adaptativo (Master v7.4 §13.3 + UX request):
            - discover: chat 55% + showcase 45% (preview do agente sendo construído)
              toggle "Ver configuração" → swap showcase ↔ config real
            - structure / build / done: chat 40% + config 60% */}

        {/* ── LEFT: Chat Panel ── */}
        <div className={`${mobileTab === "chat" ? "flex" : "hidden"} lg:flex ${
          wizardStep === "discover"
            ? (showConfigDuringDiscover ? "lg:w-[40%]" : "lg:w-[55%]")
            : "lg:w-[40%]"
        } flex-col min-w-0 overflow-hidden transition-all duration-300`}>
          <AgentChatPanel
            onBack={() => navigate("/aikortex/agents")}
            agentId={agentId && agentId !== "new" && !agentId.startsWith("new-") ? agentId : undefined}
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
            wizardStopStreaming={wizardChat.stopStreaming}
            stopStreaming={activeChat.stopStreaming}
            showConfigToggle={wizardStep === "discover" && !!agentId && !agentId.startsWith("new-") && agentId !== "new"}
            configPanelVisible={showConfigDuringDiscover}
            onToggleConfigPanel={() => setShowConfigDuringDiscover((s) => !s)}
            savedConfig={loadedAgent.savedConfig}
          />
        </div>

        {/* ── RIGHT: Showcase ↔ Config crossfade.
            Durante discover: showcase (default) e config (toggle) ficam
            empilhados no mesmo slot com opacity transition — swap suave
            sem cortes. Fora do discover: só config, slot mais largo. */}
        <div className={`${mobileTab === "config" ? "flex" : "hidden"} lg:flex ${
          wizardStep === "discover"
            ? (showConfigDuringDiscover ? "lg:w-[60%]" : "lg:w-[45%]")
            : "lg:flex-1"
        } flex-col min-w-0 overflow-hidden border-l border-border transition-all duration-300 relative`}>
          {/* Showcase layer (visível só em discover sem toggle) */}
          {wizardStep === "discover" && (
            <div className={`absolute inset-0 transition-opacity duration-300 ${
              showConfigDuringDiscover ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}>
              <WizardShowcasePanel
                savedConfig={loadedAgent.savedConfig}
                agentName={loadedAgent.name}
                agentType={loadedAgent.agentType}
              />
            </div>
          )}
          {/* Config layer (sempre montada em structure/build/done; em discover só visível quando toggle ativo) */}
          <div className={`flex flex-col min-h-0 flex-1 transition-opacity duration-300 ${
            wizardStep === "discover" && !showConfigDuringDiscover ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}>
          {/* Top bar — model selector · Testar ligação · Publicar */}
          <div className="h-12 border-b border-border flex items-center justify-between px-4 shrink-0 bg-card/30">
            <div className="flex items-center gap-2 min-w-0">
              <Bot className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-semibold truncate">{loadedAgent.name}</span>
              {/* Master v7.4 §13.16: feedback visual de tools aplicadas pelo wizard */}
              {(loadedAgent.savedConfig as any)?.businessContext?.companyName && (
                <Badge variant="outline" className="text-[10px] gap-0.5 border-blue-500/30 text-blue-700 dark:text-blue-400">
                  {(loadedAgent.savedConfig as any).businessContext.companyName}
                </Badge>
              )}
              {(loadedAgent.savedConfig as any)?.businessContext?.niche && (
                <Badge variant="outline" className="text-[10px] gap-0.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                  {(loadedAgent.savedConfig as any).businessContext.niche}
                </Badge>
              )}
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
