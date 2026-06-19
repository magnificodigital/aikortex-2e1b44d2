import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { IntegrationsGrid, LLM_PROVIDERS, SERVICE_PROVIDERS, type ProviderConfig } from "@/components/shared/IntegrationsGrid";
import EmptyIntegrationSection from "@/components/settings/EmptyIntegrationSection";
import IntegrationEmailForm from "@/components/settings/IntegrationEmailForm";
import IntegrationVoiceForm from "@/components/settings/IntegrationVoiceForm";
import IntegrationWhatsAppForm from "@/components/settings/IntegrationWhatsAppForm";
import { Button } from "@/components/ui/button";
import type { AgentType } from "@/types/agent-builder";
import { CHANNELS_BY_AGENT_TYPE, TOOLS_BY_AGENT_TYPE } from "@/types/agent-builder";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User, Zap, Settings2, AlertTriangle, Mic, Mail,
  Upload, X, FileText, Image, File, Plus, Globe, Link2, Check, Camera,
  Webhook, KeyRound, Blocks, Eye, EyeOff, ExternalLink, Trash2, Settings, Rocket,
  Youtube, Rss, Map, CloudUpload, Type, ChevronDown, ChevronUp, BookOpen,
  Brain, Wrench, Database, Workflow, GitBranch, FlaskConical, ScanSearch, FileCode2,
  ShieldAlert, Sliders, Phone, Sparkles, Share2, Plug, Bot, Lightbulb, Users, Clock, Construction,
  Activity, MessageSquare, Home,
} from "lucide-react";
import AgentMemoryTab from "./AgentMemoryTab";
import AgentToolsSection from "./AgentToolsSection";
import AgentVersionsSection from "./AgentVersionsSection";
import KnowledgeBaseSection from "./KnowledgeBaseSection";
import ClientTablesSection from "./ClientTablesSection";
import CadencesSection from "./CadencesSection";
import CadenceExecutionsPanel from "./CadenceExecutionsPanel";
import WhatsAppTemplatesPanel from "./WhatsAppTemplatesPanel";
import EmailTemplatesPanel from "./EmailTemplatesPanel";
import AgentOverviewPanel from "./AgentOverviewPanel";
import { useAgentCadences } from "@/hooks/use-agent-cadences";
import { useEmailIntegrationStatus } from "@/hooks/use-email-integration";
import { useWhatsAppIntegrationStatus } from "@/hooks/use-whatsapp-integration";
import { useWhatsAppTemplates } from "@/hooks/use-whatsapp-templates";
import { useEnabledChannels, type ChannelKey } from "@/hooks/use-enabled-channels";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import VoiceConfigPanel, { type VoiceConfig, DEFAULT_VOICE_CONFIG } from "./VoiceConfigPanel";
import {
  type AgentCapabilities,
  DEFAULT_CAPABILITIES,
  mergeCapabilities,
  countActiveCapabilities,
} from "@/types/agent-capabilities";
import { Slider } from "@/components/ui/slider";

// LLM model data is defined inline in LLM_PROVIDER_MODELS above

const LLM_PROVIDER_MODELS: Record<string, { models: { value: string; label: string; desc: string }[]; capabilities: string[] }> = {
  OpenAI: {
    models: [
      { value: "gpt-4o",        label: "GPT-4o",        desc: "Multimodal com visão e áudio." },
      { value: "gpt-4o-mini",   label: "GPT-4o Mini",   desc: "Versão leve do GPT-4o." },
      { value: "gpt-4-turbo",   label: "GPT-4 Turbo",   desc: "Alto desempenho com JSON mode." },
    ],
    capabilities: ["Chat e completions", "Visão (imagens)", "Function calling", "JSON mode"],
  },
  Anthropic: {
    models: [
      { value: "claude-sonnet-4-6",          label: "Claude Sonnet 4.5", desc: "Mais inteligente e versátil." },
      { value: "claude-opus-4-6",            label: "Claude Opus 4",     desc: "Mais poderoso da família Claude." },
      { value: "claude-haiku-4-5-20251001",  label: "Claude Haiku 4.5",  desc: "Rápido e econômico." },
    ],
    capabilities: ["Chat e completions", "Visão (imagens)", "Function calling", "Contexto de 200K tokens"],
  },
  Gemini: {
    models: [
      { value: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash", desc: "Rápido e gratuito via plataforma." },
      { value: "google/gemini-1.5-pro",   label: "Gemini 1.5 Pro",   desc: "Top-tier com contexto de 1M." },
      { value: "google/gemini-1.5-flash", label: "Gemini 1.5 Flash", desc: "Equilibrado e econômico." },
    ],
    capabilities: ["Chat e completions", "Visão (imagens e vídeo)", "Function calling", "Contexto de 1M tokens"],
  },
  ElevenLabs: {
    models: [
      { value: "eleven_multilingual_v2", label: "Multilingual v2", desc: "Voz multilíngue de alta qualidade." },
      { value: "eleven_turbo_v2_5",      label: "Turbo v2.5",      desc: "Baixa latência para tempo real." },
    ],
    capabilities: ["Text-to-speech", "Clonagem de voz", "Streaming de áudio"],
  },
  DeepSeek: {
    models: [
      { value: "deepseek-r1", label: "DeepSeek R1", desc: "Raciocínio avançado open-source." },
      { value: "deepseek-v3", label: "DeepSeek V3", desc: "Modelo geral de alta performance." },
    ],
    capabilities: ["Chat e completions", "Raciocínio avançado", "Geração de código"],
  },
};

const INTEGRATIONS = [
  { label: "OpenAI",           desc: "Modelos GPT para geração de texto e análise.",     logo: "https://cdn.simpleicons.org/openai" },
  { label: "Anthropic",        desc: "Modelos Claude para raciocínio avançado.",          logo: "https://cdn.simpleicons.org/anthropic" },
  { label: "Gemini",           desc: "IA multimodal do Google.",                          logo: "https://cdn.simpleicons.org/googlegemini" },
  { label: "ElevenLabs",       desc: "Geração de voz e text-to-speech.",                  logo: "https://cdn.simpleicons.org/elevenlabs" },
  { label: "DeepSeek",         desc: "Modelos open-source de alto desempenho.",           logo: "https://cdn.simpleicons.org/deepseek" },
  { label: "OpenRouter",       desc: "Acesso unificado a múltiplos LLMs.",                logo: "https://openrouter.ai/favicon.ico" },
  { label: "Google Calendar",  desc: "Ler e gerenciar eventos.",                          logo: "https://cdn.simpleicons.org/googlecalendar" },
  { label: "Google Sheets",    desc: "Ler e escrever planilhas.",                         logo: "https://cdn.simpleicons.org/googlesheets" },
  { label: "Google Drive",     desc: "Ler, enviar e gerenciar arquivos.",                 logo: "https://cdn.simpleicons.org/googledrive" },
  { label: "Calendly",         desc: "Agendamento automático.",                           logo: "https://cdn.simpleicons.org/calendly" },
  { label: "Outlook Calendar", desc: "Gerenciar calendário Microsoft.",                   logo: "https://cdn.simpleicons.org/microsoftoutlook" },
  { label: "Piperun",          desc: "CRM de vendas e automação.",                        logo: "https://www.piperun.com/wp-content/uploads/2023/07/favicon-piperun-crm.png" },
  { label: "HubSpot",          desc: "CRM, marketing e vendas.",                          logo: "https://cdn.simpleicons.org/hubspot" },
  { label: "RD Station",       desc: "Automação de marketing e CRM.",                     logo: "https://cdn.simpleicons.org/rdstation" },
];

const CHANNELS = [
  { value: "whatsapp",  label: "WhatsApp",  logo: "https://cdn.simpleicons.org/whatsapp" },
  { value: "instagram", label: "Instagram", logo: "https://cdn.simpleicons.org/instagram" },
  { value: "facebook",  label: "Facebook",  logo: "https://cdn.simpleicons.org/facebook" },
  { value: "linkedin",  label: "LinkedIn",  logo: "https://cdn.simpleicons.org/linkedin" },
  { value: "tiktok",    label: "TikTok",    logo: "https://cdn.simpleicons.org/tiktok" },
  { value: "website",   label: "WebSite",   logo: "" },
];

/* ── Hierarchical sidenav for the right panel (Aikortex Master v7.4 §13.5) ── */
type NavItem = {
  key: string;             // unique section id, e.g. "config.agent"
  label: string;
  icon: any;
  comingSoon?: boolean;
  sprint?: string;         // sprint target shown on placeholder
  masterRef?: string;      // master section ref shown on placeholder
  indent?: boolean;        // visual sub-item (rendered with indent + smaller)
};
type NavGroup = { group: string; items: NavItem[] };

const RIGHT_NAV: NavGroup[] = [
  { group: "Geral", items: [
    { key: "overview",               label: "Visão geral",          icon: Home },
    { key: "config.agent",           label: "Agente",               icon: Bot },
  ]},
  { group: "Capacidades", items: [
    { key: "caps.intelligence",      label: "Raciocínio",           icon: Brain },
    { key: "resources.kb",           label: "Conhecimento",         icon: BookOpen },
    { key: "resources.tables",       label: "Tabelas",              icon: Database,        masterRef: "13.5.11" },
    { key: "resources.tools",        label: "Ferramentas",          icon: Wrench },
    { key: "behavior.guardrails",    label: "Limites",              icon: ShieldAlert },
    { key: "caps.runtime",           label: "Code Runtime",         icon: FileCode2,       comingSoon: true, sprint: "futuro", masterRef: "13.5.7" },
    { key: "caps.autoint",           label: "Auto-integração",      icon: Workflow,        comingSoon: true, sprint: "futuro", masterRef: "13.5.8" },
  ]},
  { group: "Canais", items: [
    { key: "channels.email",            label: "Email",                icon: Mail },
    { key: "resources.email_templates", label: "Templates",            icon: FileText,        indent: true },
    { key: "channels.whatsapp",         label: "WhatsApp",             icon: MessageSquare },
    { key: "resources.wa_templates",    label: "Templates",            icon: FileText,        indent: true },
    { key: "channels.voice",         label: "Voz",                  icon: Mic },
    { key: "channels.sms",           label: "SMS",                  icon: Phone,           comingSoon: true, sprint: "futuro" },
    { key: "channels.instagram",     label: "Instagram",            icon: Camera,          comingSoon: true, sprint: "futuro" },
    { key: "channels.facebook",      label: "Facebook",             icon: Share2,          comingSoon: true, sprint: "futuro" },
    { key: "channels.linkedin",      label: "LinkedIn",             icon: Share2,          comingSoon: true, sprint: "futuro" },
    { key: "channels.tiktok",        label: "TikTok",               icon: Share2,          comingSoon: true, sprint: "futuro" },
    { key: "channels.telegram",      label: "Telegram",             icon: Share2,          comingSoon: true, sprint: "futuro" },
  ]},
  { group: "Integrações", items: [
    { key: "integrations.llms",      label: "LLMs",                 icon: Sparkles },
    { key: "integrations.apis",      label: "Conectores",           icon: Plug },
  ]},
  { group: "Automações", items: [
    { key: "behavior.cadences",      label: "Cadências",            icon: Clock,           masterRef: "13.5.13" },
    { key: "ops.executions",         label: "Execuções",            icon: Activity },
    { key: "behavior.squad",         label: "Squad",                icon: Users,           comingSoon: true, sprint: "Fase E", masterRef: "13.5.14" },
  ]},
  { group: "Operação", items: [
    { key: "ops.versions",           label: "Versões",              icon: GitBranch },
    { key: "system.danger",          label: "Zona de Risco",        icon: ShieldAlert },
    { key: "ops.inspector",          label: "Inspetor",             icon: ScanSearch,      comingSoon: true, sprint: "Movimento 1.5",  masterRef: "13.5.16" },
    { key: "ops.spec",               label: "Spec",                 icon: FileText,        comingSoon: true, sprint: "Fase E",         masterRef: "13.5.17" },
  ]},
];

const DEFAULT_SECTION = "overview";

/* Vibe Mode (Master v7.4 §13.2): items shown only when "Mostrar opções avançadas" is ON. */
const ADVANCED_KEYS = new Set<string>(["system.advanced"]);
const SHOW_ADVANCED_LS_KEY = "aikortex_show_advanced";

const PlaceholderSection = ({ title, masterRef, sprint, icon: Icon }: { title: string; masterRef?: string; sprint?: string; icon: any }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
      <Icon className="w-7 h-7 text-muted-foreground" />
    </div>
    <h3 className="font-semibold text-foreground">{title}</h3>
    <p className="mt-2 text-sm text-muted-foreground max-w-xs">
      Em construção — disponível no Sprint {sprint}.
    </p>
    {masterRef && (
      <p className="mt-1 text-xs text-muted-foreground">
        Referência: Aikortex Master v7.4 §{masterRef}
      </p>
    )}
  </div>
);

const DEFAULT_INSTRUCTIONS_TEMPLATE = `# 1. Identidade
Você é um assistente de IA profissional. Apresente-se sempre pelo nome configurado e mantenha consistência de personalidade em todas as interações.

# 2. Objetivo Principal
Descreva aqui a missão principal do agente. Exemplo: qualificar leads, agendar reuniões, prestar suporte ao cliente ou tirar dúvidas sobre produtos.

# 3. Público-Alvo
Defina com quem o agente irá conversar (ex: leads inbound, clientes ativos, prospects B2B). Adapte a linguagem ao perfil do interlocutor.

# 4. Tom e Estilo de Comunicação
- Mantenha tom profissional, amigável e empático.
- Use frases curtas e objetivas (máximo 2-3 linhas por mensagem).
- Evite jargões técnicos desnecessários.
- Responda sempre no idioma do usuário.

# 5. Fluxo de Conversa
1. Saudação inicial e apresentação.
2. Descoberta da necessidade (faça uma pergunta por vez).
3. Qualificação ou aprofundamento do contexto.
4. Apresentação da solução ou próximo passo.
5. Confirmação e encerramento cordial.

# 6. Regras de Comportamento
- NUNCA invente informações que não estejam na base de conhecimento.
- Sempre confirme dados sensíveis antes de prosseguir.
- Se não souber a resposta, ofereça encaminhar para um humano.
- Não compartilhe informações confidenciais ou de outros clientes.

# 7. Restrições
- Não emita opiniões pessoais sobre temas polêmicos (política, religião).
- Não faça promessas de prazo, preço ou resultados sem validação.
- Não execute ações fora do escopo configurado.

# 8. Encerramento
Sempre finalize de forma cordial, agradeça o contato e indique o próximo passo claro (ex: "vou agendar sua reunião", "um especialista entrará em contato").`;

export interface ApiConfig {
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  responseFormat: "text" | "json";
  stopSequences: string[];
}

export const DEFAULT_API_CONFIG: ApiConfig = {
  temperature: 0.7, maxTokens: 2048, topP: 1,
  frequencyPenalty: 0, presencePenalty: 0,
  responseFormat: "text", stopSequences: [],
};

export interface AgentConfig {
  name: string;
  description: string;
  objective: string;
  instructions: string;
  toneOfVoice: string;
  greetingMessage: string;
  avatarUrl: string;
  channels: string[];
  integrations: string[];
  integrationConfigs?: Record<string, ProviderConfig>;
  knowledgeFiles: string[];
  urls: string[];
  apiConfig: ApiConfig;
  voiceConfig?: VoiceConfig;
  capabilities?: AgentCapabilities;
  guardrails?: string[];
}

// FIX: presetData adicionada para receber dados do wizard
interface PresetData {
  name?: string;
  description?: string;
  objective?: string;
  instructions?: string;
  toneOfVoice?: string;
  greetingMessage?: string;
}

interface Props {
  agent: { name: string; avatar: string };
  agentType: AgentType;
  agentId?: string;
  agentModel: string;
  onModelChange: (model: string) => void;
  /** Hierarchical section key, e.g. "config.agent". */
  section?: string;
  onSectionChange?: (section: string) => void;
  /** @deprecated use section/onSectionChange */
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onApiKeysChanged?: () => void | Promise<void>;
  onConfigChange?: (config: AgentConfig) => void;
  onSaveAgent?: (config: AgentConfig & { model: string; agentType: string }) => void | Promise<void>;
  onPublish?: () => void | Promise<void>;
  canPublish?: boolean;
  isSaving?: boolean;
  hasAnthropicKey?: boolean;
  hasElevenLabsKey?: boolean;
  /** Opens VoiceCallPanel overlay */
  onTestCall?: () => void;
  /** Switches the left chat to test mode (used by Operação → Testar) */
  onSwitchToTestChat?: () => void;
  storagePrefix?: string;
  savedConfig?: Record<string, any> | null;
  // FIX: presetData — preenche campos quando IA estrutura o agente no wizard
  presetData?: PresetData;
  fieldUpdates?: Record<string, string>;
  onDeleteAgent?: () => void | Promise<void>;
}

interface KnowledgeFileLocal {
  id: string; name: string; size: number; type: string;
}

const PROVIDER_MAP: Record<string, string> = {
  "OpenAI": "openai", "Anthropic": "anthropic", "Gemini": "gemini",
  "ElevenLabs": "elevenlabs", "OpenRouter": "openrouter", "DeepSeek": "deepseek",
  "Google Calendar": "google_calendar", "Outlook Calendar": "outlook_calendar",
  "Calendly": "calendly", "Google Sheets": "google_sheets", "Google Drive": "google_drive",
  "Piperun": "piperun", "HubSpot": "hubspot", "RD Station": "rdstation",
};

const AgentRightPanel = ({
  agent, agentType, agentId, agentModel, onModelChange,
  section, onSectionChange,
  activeTab, onTabChange, onApiKeysChanged,
  onConfigChange, onSaveAgent, onPublish, canPublish,
  isSaving, hasAnthropicKey, hasElevenLabsKey,
  onTestCall, onSwitchToTestChat,
  storagePrefix, savedConfig, presetData,
  fieldUpdates, onDeleteAgent,
}: Props) => {
  const activeSection = section || activeTab || DEFAULT_SECTION;
  const goSection = (s: string) => { onSectionChange?.(s); onTabChange?.(s); };

  const relevantToolKeys    = TOOLS_BY_AGENT_TYPE[agentType]    || TOOLS_BY_AGENT_TYPE["Custom"];
  const relevantChannelKeys = CHANNELS_BY_AGENT_TYPE[agentType] || CHANNELS_BY_AGENT_TYPE["Custom"];

  const filteredIntegrations = useMemo(() => {
    const toolLabelMap: Record<string, string[]> = {
      openai: ["OpenAI"], anthropic: ["Anthropic"], gemini: ["Gemini"],
      elevenlabs: ["ElevenLabs"], google_calendar: ["Google Calendar"],
      outlook: ["Outlook Calendar"], piperun: ["Piperun"],
      rd_station: ["RD Station"], crm_generic: ["HubSpot"], deepseek: ["DeepSeek"],
    };
    const allowedLabels = new Set<string>(["OpenRouter"]);
    relevantToolKeys.forEach(key => (toolLabelMap[key] || []).forEach(l => allowedLabels.add(l)));
    if (relevantToolKeys.includes("google_calendar")) {
      ["Google Sheets", "Google Drive", "Calendly"].forEach(l => allowedLabels.add(l));
    }
    if (agentType === "Custom") {
      ["OpenAI", "Anthropic", "Gemini", "ElevenLabs", "DeepSeek"].forEach(l => allowedLabels.add(l));
    }
    return INTEGRATIONS.filter(i => allowedLabels.has(i.label));
  }, [relevantToolKeys, agentType]);

  const filteredChannels = useMemo(() => {
    if (agentType === "Custom") return CHANNELS;
    return CHANNELS.filter(ch => relevantChannelKeys.includes(ch.value as any));
  }, [relevantChannelKeys, agentType]);

  // ── Connector keys ──
  const [connectorDialog,     setConnectorDialog]     = useState<null | typeof INTEGRATIONS[0]>(null);
  const [connectorKeys,       setConnectorKeys]       = useState<Record<string, boolean>>({});
  const [keyInput,            setKeyInput]            = useState("");
  const [showKey,             setShowKey]             = useState(false);
  const [savingKey,           setSavingKey]           = useState(false);
  const [selectedDialogModel, setSelectedDialogModel] = useState("");
  const currentIntegrationConfigured = connectorDialog ? !!connectorKeys[connectorDialog.label] : false;
  const shouldShowDialogModels = !!connectorDialog && !!LLM_PROVIDER_MODELS[connectorDialog.label] && currentIntegrationConfigured;

  useEffect(() => {
    const loadKeys = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id);
      if (data) {
        const map: Record<string, boolean> = {};
        data.forEach((row: any) => {
          const label = Object.entries(PROVIDER_MAP).find(([, v]) => v === row.provider)?.[0] || row.provider;
          map[label] = true;
        });
        setConnectorKeys(map);
      }
    };
    loadKeys();
  }, []);

  const handleTabChange = (tab: string) => { goSection(tab); };

  const handleConnectIntegration = (integration: typeof INTEGRATIONS[0]) => {
    const existing = connectorKeys[integration.label];
    if (existing) {
      setKeyInput("");
    } else {
      setKeyInput("");
    }
    setShowKey(false);
    setSelectedDialogModel(LLM_PROVIDER_MODELS[integration.label]?.models[0]?.value || "");
    setConnectorDialog(integration);
  };

  const handleSaveKey = async () => {
    if (!connectorDialog || !keyInput.trim()) return;
    setSavingKey(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Faça login para salvar chaves."); return; }
      const provider = PROVIDER_MAP[connectorDialog.label] || connectorDialog.label.toLowerCase();
      const { error } = await supabase.from("user_api_keys")
        .upsert({ user_id: user.id, provider, api_key: keyInput.trim() }, { onConflict: "user_id,provider" });
      if (error) { toast.error("Erro ao salvar chave."); return; }
      setConnectorKeys(prev => ({ ...prev, [connectorDialog.label]: true }));
      await onApiKeysChanged?.();
      if (selectedDialogModel && LLM_PROVIDER_MODELS[connectorDialog.label]) onModelChange(selectedDialogModel);
      setConnectorDialog(null);
      setKeyInput("");
      toast.success(`${connectorDialog.label} conectado com sucesso!`);
    } finally { setSavingKey(false); }
  };

  const handleDisconnect = async () => {
    if (!connectorDialog) return;
    setSavingKey(true);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const provider = PROVIDER_MAP[connectorDialog.label] || connectorDialog.label.toLowerCase();
      await supabase.from("user_api_keys").delete().eq("user_id", user.id).eq("provider", provider);
      setConnectorKeys(prev => { const next = { ...prev }; delete next[connectorDialog.label]; return next; });
      await onApiKeysChanged?.();
      setConnectorDialog(null);
      setKeyInput("");
      toast.success(`${connectorDialog.label} desconectado.`);
    } finally { setSavingKey(false); }
  };

  // ── Agent fields ──
  const [settingsNav, setSettingsNav] = useState("general");

  // FIX: ordem de prioridade — savedConfig > presetData > localStorage > default
  const resolveInitial = (key: string, fromSaved?: string, fromPreset?: string): string => {
    if (fromSaved)  return fromSaved;
    if (fromPreset) return fromPreset;
    if (storagePrefix) { try { const v = localStorage.getItem(`${storagePrefix}-${key}`); if (v) return v; } catch {} }
    return "";
  };

  const [agentName,           setAgentName]           = useState(() => resolveInitial("name",           savedConfig?.name,           presetData?.name)           || agent.name || "");
  const [agentDesc,           setAgentDesc]           = useState(() => resolveInitial("desc",           savedConfig?.description,    presetData?.description));
  const [agentObjective,      setAgentObjective]      = useState(() => resolveInitial("objective",      savedConfig?.objective,      presetData?.objective));
  const [agentInstructions,   setAgentInstructions]   = useState(() => resolveInitial("instructions",   savedConfig?.instructions,   presetData?.instructions) || DEFAULT_INSTRUCTIONS_TEMPLATE);
  const [agentToneOfVoice,    setAgentToneOfVoice]    = useState(() => resolveInitial("toneOfVoice",    savedConfig?.toneOfVoice,    presetData?.toneOfVoice) || "Profissional e Amigável");
  const [agentGreetingMessage,setAgentGreetingMessage]= useState(() => resolveInitial("greetingMessage",savedConfig?.greetingMessage,presetData?.greetingMessage));
  // Guardrails — frame negativo "o que o agente NUNCA pode fazer".
  // Lista de strings: preset opcional + custom.
  const [agentGuardrails, setAgentGuardrails] = useState<string[]>(
    () => (savedConfig?.guardrails as string[]) ?? []
  );
  const [agentCustomGuardrail, setAgentCustomGuardrail] = useState("");

  // Master v7.4 §13.16 (Modo Vibe Acting): quando wizard chama tools que
  // mutam o draft, savedConfig é atualizado via polling. Sincroniza state
  // local com prop pra UI refletir mudanças em tempo real. Só atualiza se
  // o valor do prop é diferente do state atual (evita override de edit
  // manual em curso pelo usuário).
  useEffect(() => {
    if (!savedConfig) return;
    if (savedConfig.name !== undefined && savedConfig.name !== agentName && savedConfig.name) {
      setAgentName(savedConfig.name);
    }
    if (savedConfig.description !== undefined && savedConfig.description !== agentDesc && savedConfig.description) {
      setAgentDesc(savedConfig.description);
    }
    // Pega objective de profile (onde set_objective salva) ou top-level
    const cfgObjective = savedConfig?.profile?.primaryGoal || savedConfig?.objective;
    if (cfgObjective && cfgObjective !== agentObjective) {
      setAgentObjective(cfgObjective);
    }
    // Pega instructions de profile (onde set_instructions salva) ou top-level
    const cfgInstructions = savedConfig?.profile?.instructions || savedConfig?.instructions;
    if (cfgInstructions && cfgInstructions !== agentInstructions) {
      setAgentInstructions(cfgInstructions);
    }
    // Pega tone de businessContext (onde set_tone_of_voice salva) ou top-level
    const cfgTone = savedConfig?.businessContext?.toneOfVoice || savedConfig?.toneOfVoice;
    if (cfgTone && cfgTone !== agentToneOfVoice) {
      setAgentToneOfVoice(cfgTone);
    }
    // Pega greeting de businessContext ou top-level
    const cfgGreeting = savedConfig?.businessContext?.greetingMessage || savedConfig?.greetingMessage;
    if (cfgGreeting && cfgGreeting !== agentGreetingMessage) {
      setAgentGreetingMessage(cfgGreeting);
    }
    // Channels: aceita array ou objeto {whatsapp:true,email:true} (vibe-mutate)
    const ch = (savedConfig as any)?.channels;
    let normalized: string[] = [];
    if (Array.isArray(ch)) normalized = ch;
    else if (ch && typeof ch === "object") {
      normalized = Object.entries(ch).filter(([, v]) => v === true).map(([k]) => k);
    }
    if (normalized.length > 0) {
      setConnectedChannels(prev => {
        const merged = Array.from(new Set([...prev, ...normalized]));
        return merged.length === prev.length && prev.every(c => merged.includes(c)) ? prev : merged;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedConfig]);

  const [knowledgeFiles,    setKnowledgeFiles]    = useState<KnowledgeFileLocal[]>(() => {
    if (savedConfig?.knowledgeFiles?.length)
      return savedConfig.knowledgeFiles.map((n: string, i: number) => ({ id: String(i), name: n, size: 0, type: "" }));
    return [];
  });
  const [urlInput,          setUrlInput]          = useState("");
  const [urls,              setUrls]              = useState<string[]>(() => savedConfig?.urls?.length     ? savedConfig.urls     : []);
  const [knowledgeEnabled,  setKnowledgeEnabled]  = useState(true);
  const [youtubeUrls,       setYoutubeUrls]       = useState<string[]>([]);
  const [youtubeInput,      setYoutubeInput]      = useState("");
  const [rssUrls,           setRssUrls]           = useState<string[]>([]);
  const [rssInput,          setRssInput]           = useState("");
  const [sitemapUrls,       setSitemapUrls]        = useState<string[]>([]);
  const [sitemapInput,      setSitemapInput]       = useState("");
  const [customTexts,       setCustomTexts]        = useState<string[]>([]);
  const [customTextInput,   setCustomTextInput]    = useState("");
  const [knowledgeSection,  setKnowledgeSection]   = useState<string | null>("web");
  const [connectedChannels, setConnectedChannels] = useState<string[]>(() => {
    // agent-vibe-mutate salva como objeto {whatsapp:true,email:true};
    // legado/UI manual salva como array. Aceita ambos.
    const ch = savedConfig?.channels as any;
    if (Array.isArray(ch)) return ch;
    if (ch && typeof ch === "object") {
      return Object.entries(ch).filter(([, v]) => v === true).map(([k]) => k);
    }
    return [];
  });
  const [savedIntegrations, setSavedIntegrations] = useState<string[]>(() => savedConfig?.integrations?.length ? savedConfig.integrations : []);
  const [integrationConfigs, setIntegrationConfigs] = useState<Record<string, ProviderConfig>>(() => savedConfig?.integrationConfigs || {});
  const [apiConfig,         setApiConfig]         = useState<ApiConfig>(() =>
    savedConfig?.apiConfig ? { ...DEFAULT_API_CONFIG, ...savedConfig.apiConfig } : DEFAULT_API_CONFIG
  );
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>(() =>
    savedConfig?.voiceConfig ? { ...DEFAULT_VOICE_CONFIG, ...savedConfig.voiceConfig } : { ...DEFAULT_VOICE_CONFIG, agentName: agent.name }
  );
  const [capabilities, setCapabilities] = useState<AgentCapabilities>(() =>
    mergeCapabilities(savedConfig?.capabilities)
  );
  const updateCapability = useCallback(
    <K extends keyof AgentCapabilities>(key: K, patch: Partial<AgentCapabilities[K]>) => {
      setCapabilities(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    },
    []
  );
  const activeCapsCount = useMemo(() => countActiveCapabilities(capabilities), [capabilities]);

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(() => savedConfig?.avatarUrl || null);

  // FIX: quando presetData muda (wizard estruturou), atualizar campos
  useEffect(() => {
    if (!presetData) return;
    if (presetData.name)            setAgentName(presetData.name);
    if (presetData.description)     setAgentDesc(presetData.description);
    if (presetData.objective)       setAgentObjective(presetData.objective);
    if (presetData.instructions)    setAgentInstructions(presetData.instructions);
    if (presetData.toneOfVoice)     setAgentToneOfVoice(presetData.toneOfVoice);
    if (presetData.greetingMessage) setAgentGreetingMessage(presetData.greetingMessage);
  }, [presetData]);

  // FIX: fieldUpdates do chat — atualiza campos em tempo real
  useEffect(() => {
    if (!fieldUpdates) return;
    const map: Record<string, (v: string) => void> = {
      name:            setAgentName,
      description:     setAgentDesc,
      objective:       setAgentObjective,
      instructions:    setAgentInstructions,
      toneOfVoice:     setAgentToneOfVoice,
      greetingMessage: setAgentGreetingMessage,
    };
    Object.entries(fieldUpdates).forEach(([field, value]) => {
      if (field === "channels") {
        const chs = value.split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
        setConnectedChannels(prev => Array.from(new Set([...prev, ...chs])));
      } else if (map[field]) {
        map[field](value);
      }
    });
  }, [fieldUpdates]);

  // Emitir config para o pai — use ref to avoid stale closure
  const onConfigChangeRef = useRef(onConfigChange);
  onConfigChangeRef.current = onConfigChange;

  useEffect(() => {
    const config: AgentConfig = {
      name: agentName, description: agentDesc, objective: agentObjective,
      instructions: agentInstructions, toneOfVoice: agentToneOfVoice,
      greetingMessage: agentGreetingMessage,
      avatarUrl: avatarPreview || agent.avatar || "",
      channels: connectedChannels,
      integrations: savedIntegrations,
      integrationConfigs,
      knowledgeFiles: knowledgeFiles.map(f => f.name), urls, apiConfig,
      voiceConfig,
      capabilities,
      guardrails: agentGuardrails,
    };
    onConfigChangeRef.current?.(config);
  }, [agentName, agentDesc, agentObjective, agentInstructions, agentToneOfVoice, agentGreetingMessage,
      avatarPreview, connectedChannels, savedIntegrations, integrationConfigs, knowledgeFiles, urls, apiConfig, voiceConfig, capabilities, agentGuardrails, agent.avatar]);

  // ── Helpers ──
  const handleFiles = (files: FileList) => {
    const newFiles: KnowledgeFileLocal[] = Array.from(files)
      .filter(f => f.size <= 10 * 1024 * 1024)
      .map(f => ({ id: crypto.randomUUID(), name: f.name, size: f.size, type: f.type }));
    setKnowledgeFiles(prev => [...prev, ...newFiles]);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/"))      return <Image    className="w-4 h-4 text-primary shrink-0" />;
    if (type === "application/pdf")     return <FileText className="w-4 h-4 text-destructive shrink-0" />;
    return                                     <File     className="w-4 h-4 text-muted-foreground shrink-0" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0)         return "";
    if (bytes < 1024)        return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return                          `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const addUrl = () => {
    if (urlInput.trim() && !urls.includes(urlInput.trim())) {
      setUrls([...urls, urlInput.trim()]);
      setUrlInput("");
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ext  = file.name.split(".").pop() || "png";
      const path = `${user.id}/agent-avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("agent-avatars").upload(path, file, { upsert: true });
      if (error) { toast.error("Erro ao enviar imagem."); return; }
      const { data: urlData } = supabase.storage.from("agent-avatars").getPublicUrl(path);
      if (urlData?.publicUrl) { setAvatarPreview(urlData.publicUrl); toast.success("Avatar atualizado!"); }
    } catch { toast.error("Erro ao enviar avatar."); }
  };

  const toggleChannel = (value: string) => {
    setConnectedChannels(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const buildSavePayload = () => ({
    name: agentName, description: agentDesc, objective: agentObjective,
    instructions: agentInstructions, toneOfVoice: agentToneOfVoice,
    greetingMessage: agentGreetingMessage, avatarUrl: avatarPreview || agent.avatar || "",
    channels: connectedChannels,
    integrations: savedIntegrations,
    integrationConfigs,
    knowledgeFiles: knowledgeFiles.map(f => f.name), urls, apiConfig, voiceConfig,
    capabilities,
    model: agentModel, agentType,
  });

  const activeNavItem = useMemo(
    () => RIGHT_NAV.flatMap(g => g.items).find(i => i.key === activeSection),
    [activeSection]
  );

  /* ── Vibe Mode toggle (Master v7.4 §13.2) ── */
  const [showAdvanced, setShowAdvanced] = useState<boolean>(() => {
    try { return localStorage.getItem(SHOW_ADVANCED_LS_KEY) === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(SHOW_ADVANCED_LS_KEY, showAdvanced ? "1" : "0"); } catch {}
  }, [showAdvanced]);

  /* ── Canais ativados pela agência (Settings → Canais) ── */
  const { data: enabledChannelsList = [] } = useEnabledChannels();
  const enabledSet = useMemo(() => new Set(enabledChannelsList), [enabledChannelsList]);

  const visibleNav = useMemo(() => {
    return RIGHT_NAV
      .map(g => {
        let items = g.items.filter(i => !i.comingSoon && (showAdvanced || !ADVANCED_KEYS.has(i.key)));
        // Filtra Canais por enabled list. Sub-itens Templates só aparecem quando o usuário
        // está no canal-pai (ou já está no próprio Templates).
        if (g.group === "Canais") {
          items = items.filter((i) => {
            if (i.key === "resources.email_templates") {
              if (!enabledSet.has("email")) return false;
              return activeSection === "channels.email" || activeSection === "resources.email_templates";
            }
            if (i.key === "resources.wa_templates") {
              if (!enabledSet.has("whatsapp")) return false;
              return activeSection === "channels.whatsapp" || activeSection === "resources.wa_templates";
            }
            if (i.indent) return true;
            if (!i.key.startsWith("channels.")) return true;
            const channelKey = i.key.replace("channels.", "");
            // Canal aparece se a agência habilitou OU se o agente específico
            // ativou (via wizard) — mesmo que a agência ainda não tenha habilitado
            // o canal globalmente, o user vê pra poder configurar.
            return enabledSet.has(channelKey as ChannelKey) || connectedChannels.includes(channelKey);
          });
        }
        return { ...g, items };
      })
      .filter(g => g.items.length > 0);
  }, [showAdvanced, enabledSet, activeSection, connectedChannels]);

  /* ── Status badges nos itens do menu ── */
  const { data: cadencesForBadge = [] } = useAgentCadences(agentId);
  const { data: emailStatusForBadge } = useEmailIntegrationStatus();
  const { data: waStatusForBadge } = useWhatsAppIntegrationStatus();
  const { data: waTemplatesForBadge = [] } = useWhatsAppTemplates();

  // Retorna o conteúdo do badge pra um item do menu:
  //   - número: pra coisas contáveis (cadências, templates aprovados, integrações ativas)
  //   - 'dot': verde se há config (boolean)
  //   - null: sem badge
  function getMenuBadge(key: string): { kind: "count"; value: number } | { kind: "dot" } | null {
    switch (key) {
      case "behavior.cadences":
        return cadencesForBadge.length > 0 ? { kind: "count", value: cadencesForBadge.length } : null;
      case "channels.email":
        return emailStatusForBadge?.connected ? { kind: "dot" } : null;
      case "channels.whatsapp":
        return waStatusForBadge?.connected ? { kind: "dot" } : null;
      case "resources.wa_templates": {
        const n = waTemplatesForBadge.filter((t) => t.status === "APPROVED").length;
        return n > 0 ? { kind: "count", value: n } : null;
      }
      case "config.agent":
        return (agentInstructions?.trim() && agentToneOfVoice?.trim()) ? { kind: "dot" } : null;
      default:
        return null;
    }
  }

  // If active section becomes hidden after toggling off, fall back to default.
  useEffect(() => {
    const visible = visibleNav.flatMap(g => g.items).some(i => i.key === activeSection);
    if (!visible) goSection(DEFAULT_SECTION);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleNav]);

  return (
    <div className="flex h-full min-w-0 overflow-hidden">

      {/* ── Hierarchical sidenav (Vibe Mode by default) ── */}
      <aside className="w-56 border-r border-border bg-card/30 shrink-0 overflow-y-auto py-3 hidden md:block">
        <div className="px-3 mb-3">
          <label className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground cursor-pointer">
            <span className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5" />
              <span>Opções avançadas</span>
            </span>
            <Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} />
          </label>
        </div>
        {visibleNav.map((g) => (
          <div key={g.group} className="px-3 mb-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-2 flex items-center gap-1.5">
              <span>{g.group}</span>
              {g.group === "Capacidades" && activeCapsCount > 0 && (
                <span className="text-[9px] bg-primary/15 text-primary rounded-full px-1.5 py-0 normal-case tracking-normal font-semibold">
                  {activeCapsCount}
                </span>
              )}
            </p>
            <div className="space-y-0.5">
              {g.items.map((item) => {
                const Icon = item.icon;
                const active = activeSection === item.key;
                const capActive =
                  item.key === "caps.intelligence" && (
                    capabilities.planning.enabled ||
                    capabilities.reasoning.enabled ||
                    capabilities.memory.enabled
                  );
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => goSection(item.key)}
                    className={`w-full text-left flex items-center justify-between gap-2 ${item.indent ? "pl-7 pr-2 py-1" : "px-2 py-1.5"} rounded-md text-xs transition-colors ${
                      active
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Icon className={`${item.indent ? "w-3 h-3" : "w-3.5 h-3.5"} shrink-0`} />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {(() => {
                      const badge = getMenuBadge(item.key);
                      if (capActive) {
                        return <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-label="ativo" />;
                      }
                      if (badge?.kind === "count") {
                        return (
                          <span className="text-[9px] bg-primary/15 text-primary rounded-full px-1.5 py-0 font-semibold shrink-0">
                            {badge.value}
                          </span>
                        );
                      }
                      if (badge?.kind === "dot") {
                        return <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-label="configurado" />;
                      }
                      return null;
                    })()}
                  </button>
                );
              })}
          </div>
          </div>
        ))}
      </aside>

      {/* ── Content area ── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Mobile section selector */}
        <div className="md:hidden border-b border-border px-3 py-2 flex items-center gap-2">
          <Select value={activeSection} onValueChange={(v) => goSection(v)}>
            <SelectTrigger className="h-8 text-xs flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {visibleNav.flatMap(g => g.items).map(i => (
                <SelectItem key={i.key} value={i.key} className="text-xs">{i.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
            <Switch checked={showAdvanced} onCheckedChange={setShowAdvanced} />
            <span>Avançado</span>
          </label>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 max-w-2xl space-y-8">

            {/* ── Coming-soon placeholders ── */}
            {activeNavItem?.comingSoon && (
              <PlaceholderSection
                title={activeNavItem.label}
                masterRef={activeNavItem.masterRef}
                sprint={activeNavItem.sprint}
                icon={activeNavItem.icon}
              />
            )}

            {/* ── Capacidades → Inteligência (Planning + Reasoning + Memória unificados) ── */}
            {activeSection === "caps.intelligence" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" /> Raciocínio
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Como o agente raciocina, planeja e lembra de contexto. Ative as capacidades necessárias pro perfil dele.
                  </p>
                </div>

                {/* ── Planning ── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Planning</h3>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Antes de responder, o agente decompõe a solicitação em passos e os executa em sequência. Útil para tarefas complexas.
                  </p>
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Ativar Planning</p>
                      <p className="text-xs text-muted-foreground">Reduz alucinações em fluxos complexos.</p>
                    </div>
                    <Switch
                      checked={capabilities.planning.enabled}
                      onCheckedChange={(v) => updateCapability("planning", { enabled: v })}
                    />
                  </div>
                  {capabilities.planning.enabled && (
                    <div className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">Número máximo de passos</p>
                        <span className="text-sm font-semibold text-primary">{capabilities.planning.max_steps}</span>
                      </div>
                      <Slider
                        min={3}
                        max={30}
                        step={1}
                        value={[capabilities.planning.max_steps]}
                        onValueChange={([v]) => updateCapability("planning", { max_steps: v })}
                      />
                      <p className="text-[11px] text-muted-foreground">3 a 30 passos. Recomendado: 10.</p>
                    </div>
                  )}
                </div>

                {/* ── Reasoning ── */}
                <div className="space-y-3 border-t border-border pt-5">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Reasoning</h3>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Antes de responder, o agente "pensa" usando chain-of-thought. Melhora respostas que exigem dedução ou interpretação ambígua.
                  </p>
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Ativar Reasoning</p>
                      <p className="text-xs text-muted-foreground">Mais qualidade em respostas com nuance.</p>
                    </div>
                    <Switch
                      checked={capabilities.reasoning.enabled}
                      onCheckedChange={(v) => updateCapability("reasoning", { enabled: v })}
                    />
                  </div>
                  {capabilities.reasoning.enabled && (
                    <div className="rounded-lg border border-border p-3 space-y-2">
                      <p className="text-sm font-medium text-foreground">Profundidade do raciocínio</p>
                      <RadioGroup
                        value={capabilities.reasoning.depth}
                        onValueChange={(v) => updateCapability("reasoning", { depth: v as "low" | "medium" | "high" })}
                        className="gap-2"
                      >
                        {[
                          { v: "low",    label: "Baixa",  desc: "Raciocínio breve, foco no essencial." },
                          { v: "medium", label: "Média",  desc: "Chain-of-thought equilibrado. Recomendado." },
                          { v: "high",   label: "Alta",   desc: "Raciocínio aprofundado. Maior latência e custo." },
                        ].map((opt) => (
                          <label key={opt.v} htmlFor={`reasoning-${opt.v}`} className="flex items-start gap-2 cursor-pointer rounded-md hover:bg-muted/40 p-2 -mx-2">
                            <RadioGroupItem value={opt.v} id={`reasoning-${opt.v}`} className="mt-0.5" />
                            <div>
                              <p className="text-sm text-foreground">{opt.label}</p>
                              <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                            </div>
                          </label>
                        ))}
                      </RadioGroup>
                    </div>
                  )}
                </div>

                {/* ── Memória ── */}
                <div className="space-y-3 border-t border-border pt-5">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Memória persistente</h3>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-1">
                    O agente lembra contexto de conversas anteriores e acessa informações via busca semântica.
                  </p>

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Ativar Memória</p>
                    <p className="text-xs text-muted-foreground">Lembra preferências e histórico entre sessões.</p>
                  </div>
                  <Switch
                    checked={capabilities.memory.enabled}
                    onCheckedChange={(v) => updateCapability("memory", { enabled: v })}
                  />
                </div>

                {capabilities.memory.enabled && (
                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">Escopo da memória</p>
                    <RadioGroup
                      value={capabilities.memory.scope}
                      onValueChange={(v) => updateCapability("memory", { scope: v as "agent" | "client" | "shared" })}
                      className="gap-2"
                    >
                      {[
                        { v: "agent",  label: "Por agente",            desc: "Cada agente tem sua própria memória." },
                        { v: "client", label: "Por cliente",           desc: "Compartilhada entre todos agentes do cliente." },
                        { v: "shared", label: "Compartilhada (avançado)", desc: "Agentes selecionados compartilham memória. Disponível quando pgvector chegar (Sprint 2.5)." },
                      ].map((opt) => (
                        <label key={opt.v} htmlFor={`mem-${opt.v}`} className="flex items-start gap-2 cursor-pointer rounded-md hover:bg-muted/40 p-2 -mx-2">
                          <RadioGroupItem value={opt.v} id={`mem-${opt.v}`} className="mt-0.5" />
                          <div>
                            <p className="text-sm text-foreground">{opt.label}</p>
                            <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                          </div>
                        </label>
                      ))}
                    </RadioGroup>
                    <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-[11px] text-amber-600">
                      ⚠️ Stub Anthropic atual — backend pgvector chega no Sprint 2.5.
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">Configurações do provedor atual</h3>
                  {hasAnthropicKey ? (
                    <AgentMemoryTab agentId={agentId} />
                  ) : (
                    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4 flex items-start gap-3">
                      <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-foreground">Memória persistente requer Anthropic</p>
                        <p className="text-xs text-muted-foreground">Configure sua chave Anthropic em Recursos → Integrações para ativar a memória do agente.</p>
                        <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary" onClick={() => goSection("integrations.llms")}>Ir para Integrações</Button>
                      </div>
                    </div>
                  )}
                </div>
                </div>
              </div>
            )}

            {/* ── Operação → Execuções (dashboard de cadências) ── */}
            {activeSection === "ops.executions" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Execuções</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Acompanhe em tempo real as cadências disparadas para os contatos do agente.
                  </p>
                </div>
                <CadenceExecutionsPanel agentId={agentId} />
              </div>
            )}

            {/* ── Operação → Versões ── */}
            {activeSection === "ops.versions" && (
              <AgentVersionsSection agentId={agentId} />
            )}

            {/* ── Operação → Testar (atalho para chat em modo teste) ── */}
            {activeSection === "ops.test" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Testar agente</h2>
                  <p className="text-sm text-muted-foreground mt-1">Converse com o agente como se fosse um usuário real para validar comportamento, tom e respostas.</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-primary" />
                    <p className="text-sm font-semibold">Modo de teste (chat)</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Abre o painel de chat à esquerda no modo teste, usando o modelo configurado.</p>
                  <Button size="sm" onClick={() => onSwitchToTestChat?.()} className="gap-1.5"><FlaskConical className="w-3.5 h-3.5" /> Abrir chat em modo teste</Button>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    <p className="text-sm font-semibold">Testar ligação por voz</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Inicia uma ligação de teste com o agente usando ElevenLabs.</p>
                  <Button size="sm" variant="outline" onClick={() => onTestCall?.()} className="gap-1.5" disabled={!hasElevenLabsKey}>
                    <Phone className="w-3.5 h-3.5" /> {hasElevenLabsKey ? "Iniciar ligação de teste" : "Configure ElevenLabs primeiro"}
                  </Button>
                </div>
              </div>
            )}

            {/* ── Sistema → Avançado ── */}
            {activeSection === "system.advanced" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Avançado</h2>
                  <p className="text-sm text-muted-foreground mt-1">Parâmetros do modelo e ajustes técnicos.</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Temperatura ({apiConfig.temperature.toFixed(2)})</h3>
                  <p className="text-[11px] text-muted-foreground">Controla a criatividade. Valores baixos = mais determinístico.</p>
                  <input type="range" min={0} max={2} step={0.05} value={apiConfig.temperature}
                    onChange={(e) => setApiConfig({ ...apiConfig, temperature: parseFloat(e.target.value) })}
                    className="w-full" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Max tokens</h3>
                  <Input type="number" min={256} max={32000} value={apiConfig.maxTokens}
                    onChange={(e) => setApiConfig({ ...apiConfig, maxTokens: parseInt(e.target.value) || 2048 })}
                    className="text-sm" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">Top-p ({apiConfig.topP.toFixed(2)})</h3>
                  <input type="range" min={0} max={1} step={0.05} value={apiConfig.topP}
                    onChange={(e) => setApiConfig({ ...apiConfig, topP: parseFloat(e.target.value) })}
                    className="w-full" />
                </div>
              </div>
            )}


                {/* ── Visão Geral (home) ── */}
                {activeSection === "overview" && agentId && (
                  <AgentOverviewPanel
                    agentId={agentId}
                    agentName={agent.name}
                    agentVersion={null}
                    agentStatus={canPublish ? "publicado" : "rascunho"}
                    isInstructionsSet={!!(agentInstructions && agentInstructions.trim().length > 0)}
                    isTonalitySet={!!(agentToneOfVoice && agentToneOfVoice.trim().length > 0)}
                    onGoSection={goSection}
                  />
                )}

                {/* Identidade */}
                {activeSection === "config.agent" && (
                  <>
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Identidade</h2>
                      <p className="text-sm text-muted-foreground mt-1">Identidade e propósito do agente.</p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">Avatar</h3>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                          onClick={() => avatarInputRef.current?.click()}>
                          {(() => {
                            const url = avatarPreview || agent.avatar;
                            if (!url) return <Camera className="w-6 h-6 text-muted-foreground" />;
                            const isIcon = url.includes("aikortex-icon");
                            return isIcon
                              ? <img src={url} alt="Avatar" className="w-full h-full object-contain p-3 bg-gradient-to-br from-primary/15 to-primary/5" />
                              : <img src={url} alt="Avatar" className="w-full h-full object-cover" />;
                          })()}
                        </div>
                        <div>
                          <Button variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()} className="text-xs">Enviar foto</Button>
                          <p className="text-[11px] text-muted-foreground mt-1">JPEG, PNG ou WebP · até 5 MB</p>
                        </div>
                        <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">Nome do agente</h3>
                      <Input value={agentName} onChange={(e) => setAgentName(e.target.value)} className="text-sm" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">Cargo / Função</h3>
                      <Input value={agentDesc} onChange={(e) => setAgentDesc(e.target.value)} placeholder="Ex: Especialista em qualificação de leads" className="text-sm" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">Tom de voz</h3>
                      <Input
                        list="tone-of-voice-options"
                        value={agentToneOfVoice}
                        onChange={(e) => setAgentToneOfVoice(e.target.value)}
                        placeholder="Ex: Profissional e Amigável"
                        className="text-sm"
                      />
                      <datalist id="tone-of-voice-options">
                        <option value="Profissional e Amigável" />
                        <option value="Formal" />
                        <option value="Casual e Descontraído" />
                        <option value="Empático e Acolhedor" />
                        <option value="Direto e Objetivo" />
                        <option value="Técnico" />
                        <option value="Consultivo" />
                      </datalist>
                      <p className="text-[11px] text-muted-foreground">Escolha uma opção sugerida ou descreva o tom em texto livre.</p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">Mensagem de saudação</h3>
                      <Textarea value={agentGreetingMessage} onChange={(e) => setAgentGreetingMessage(e.target.value)}
                        placeholder="Ex: Olá! Sou a assistente virtual. Como posso te ajudar?" className="text-sm min-h-[80px]" />
                    </div>
                  </>
                )}

                {/* Instruções (objetivo + comportamento unificados, estruturados em tópicos) */}
                {activeSection === "config.agent" && (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-foreground">Instruções</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Prompt completo do agente: objetivo, público, tom, fluxo, regras e restrições — organizado em tópicos.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs shrink-0"
                        onClick={() => {
                          const merged = agentObjective?.trim()
                            ? `# 2. Objetivo Principal\n${agentObjective.trim()}\n\n${DEFAULT_INSTRUCTIONS_TEMPLATE.replace(/# 2\. Objetivo Principal[\s\S]*?(?=\n# 3\.)/, "")}`
                            : DEFAULT_INSTRUCTIONS_TEMPLATE;
                          setAgentInstructions(merged);
                          if (agentObjective?.trim()) setAgentObjective("");
                        }}
                      >
                        Carregar template
                      </Button>
                    </div>
                    <Textarea
                      value={agentInstructions}
                      onChange={(e) => setAgentInstructions(e.target.value)}
                      placeholder={DEFAULT_INSTRUCTIONS_TEMPLATE}
                      className="text-sm min-h-[480px] font-mono leading-relaxed"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Dica: use <code className="px-1 rounded bg-muted">#</code> para títulos e <code className="px-1 rounded bg-muted">-</code> para listas. Quanto mais específico, melhor o desempenho do agente.
                    </p>
                  </div>
                )}

                {/* Recursos → Knowledge Base (Sprint 2.5-d) */}
                {activeSection === "resources.kb" && (
                  <KnowledgeBaseSection
                    agentId={agentId}
                    isFreshNew={!agentId}
                    onGoToAgentTab={() => goSection("config.agent")}
                  />
                )}

                {/* Voz */}
                {activeSection === "config.voice" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Configurações de Voz</h2>
                      <p className="text-sm text-muted-foreground mt-1">Personalize a voz e o comportamento do agente em chamadas.</p>
                    </div>

                    {/* Warning: ElevenLabs not configured */}
                    {!connectorKeys["ElevenLabs"] && (
                      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-foreground">Configure sua chave da ElevenLabs em Integrações para ativar ligações com voz.</p>
                          <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary" onClick={() => goSection("integrations.llms")}>
                            Ir para Integrações
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Warning: Telnyx not configured */}
                    {!connectorKeys["Telnyx"] && (
                      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-foreground">Configure sua chave da Telnyx em Integrações para ativar ligações por telefone.</p>
                          <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary" onClick={() => goSection("integrations.llms")}>
                            Ir para Integrações
                          </Button>
                        </div>
                      </div>
                    )}

                    <VoiceConfigPanel config={voiceConfig} onChange={setVoiceConfig} />
                  </div>
                )}

            {/* ── Recursos → Tools (Sprint 2.4-a §13.15) ── */}
            {activeSection === "resources.tools" && (
              <AgentToolsSection agentId={agentId} />
            )}

            {activeSection === "resources.tables" && (
              <ClientTablesSection agentId={agentId} isFreshNew={!agentId} />
            )}

            {activeSection === "behavior.guardrails" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Limites do agente</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    O que o agente <strong>nunca</strong> pode fazer. Marque as opções que se aplicam — elas viram instruções claras
                    no prompt e protegem você de surpresas (preços inventados, promessas de prazo, decisão jurídica, etc).
                  </p>
                </div>

                {/* Universais — fazem sentido pra qualquer agente customer-facing */}
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">Universais</p>
                  <div className="space-y-2">
                  {[
                    { key: "preco_desconto",        label: "Falar de preços ou conceder descontos",       hint: "Qualquer dúvida de valor → passa pra humano" },
                    { key: "prazo_entrega",         label: "Prometer prazos de entrega ou de contrato",   hint: "Só repassa o que está nos sistemas, nunca inventa" },
                    { key: "juridico_contratual",   label: "Responder questões jurídicas ou contratuais", hint: "Encaminha direto pra equipe responsável" },
                    { key: "reclamacao_seria",      label: "Lidar com reclamação séria",                   hint: "Cliente bravo → handoff humano imediato" },
                    { key: "fechar_negocio",        label: "Fechar negócio ou contrato sem aprovação",    hint: "Proposta/assinatura sempre passa por humano" },
                    { key: "dados_pessoais",        label: "Pedir ou divulgar dados pessoais sensíveis",  hint: "CPF, senhas, cartão — só humano autorizado" },
                  ].map((g) => {
                    const checked = agentGuardrails.includes(g.label);
                    return (
                      <label
                        key={g.key}
                        className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/30 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAgentGuardrails((prev) => Array.from(new Set([...prev, g.label])));
                            } else {
                              setAgentGuardrails((prev) => prev.filter((x) => x !== g.label));
                            }
                          }}
                          className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground">{g.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{g.hint}</p>
                        </div>
                      </label>
                    );
                  })}
                  </div>
                </div>

                {/* Contextuais por tipo de agente */}
                {(() => {
                  const contextual: Record<string, { key: string; label: string; hint: string }[]> = {
                    SDR: [
                      { key: "fechar_venda",      label: "Confirmar venda sem aval do gestor",     hint: "SDR qualifica e agenda — fechamento é com humano" },
                      { key: "desconto_agressivo", label: "Negociar descontos fora da política",     hint: "Tabela de desconto sempre passa por humano" },
                    ],
                    BDR: [
                      { key: "prospec_fora",      label: "Prospectar leads fora do ICP definido",  hint: "Mantém foco no perfil ideal de cliente" },
                    ],
                    SAC: [
                      { key: "troca_devolucao",   label: "Aprovar troca / devolução sozinho",      hint: "Política de troca = decisão humana" },
                      { key: "extorno_reembolso", label: "Autorizar estorno ou reembolso",         hint: "Movimentação financeira → equipe responsável" },
                      { key: "cancelar_assinatura", label: "Cancelar plano / assinatura do cliente", hint: "Retenção tenta humano antes" },
                    ],
                    CS: [
                      { key: "promessa_features", label: "Prometer features que não estão no roadmap", hint: "Só repete o roadmap público" },
                      { key: "alterar_plano",     label: "Mudar plano ou cobrança do cliente",      hint: "Movimentação contratual → CSM humano" },
                    ],
                  };
                  const list = contextual[agentType] || [];
                  if (list.length === 0) return null;
                  return (
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                        Específicos pra {agentType}
                      </p>
                      <div className="space-y-2">
                        {list.map((g) => {
                          const checked = agentGuardrails.includes(g.label);
                          return (
                            <label
                              key={g.key}
                              className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/30 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setAgentGuardrails((prev) => Array.from(new Set([...prev, g.label])));
                                  } else {
                                    setAgentGuardrails((prev) => prev.filter((x) => x !== g.label));
                                  }
                                }}
                                className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">{g.label}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{g.hint}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Custom guardrails */}
                <div className="space-y-2 pt-2">
                  <h3 className="text-sm font-semibold text-foreground">Outras regras (livre)</h3>
                  <div className="flex gap-2">
                    <Input
                      value={agentCustomGuardrail}
                      onChange={(e) => setAgentCustomGuardrail(e.target.value)}
                      placeholder='Ex: "Nunca falar de concorrentes"'
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && agentCustomGuardrail.trim()) {
                          e.preventDefault();
                          setAgentGuardrails((prev) => Array.from(new Set([...prev, agentCustomGuardrail.trim()])));
                          setAgentCustomGuardrail("");
                        }
                      }}
                      className="text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (agentCustomGuardrail.trim()) {
                          setAgentGuardrails((prev) => Array.from(new Set([...prev, agentCustomGuardrail.trim()])));
                          setAgentCustomGuardrail("");
                        }
                      }}
                    >
                      Adicionar
                    </Button>
                  </div>
                  {agentGuardrails.filter((g) =>
                    !["Falar de preços ou conceder descontos", "Prometer prazos de entrega ou de contrato",
                      "Responder questões jurídicas ou contratuais", "Lidar com reclamação séria",
                      "Fechar negócio ou contrato sem aprovação", "Pedir ou divulgar dados pessoais sensíveis"].includes(g)
                  ).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {agentGuardrails
                        .filter((g) =>
                          !["Falar de preços ou conceder descontos", "Prometer prazos de entrega ou de contrato",
                            "Responder questões jurídicas ou contratuais", "Lidar com reclamação séria",
                            "Fechar negócio ou contrato sem aprovação", "Pedir ou divulgar dados pessoais sensíveis"].includes(g)
                        )
                        .map((g) => (
                          <span
                            key={g}
                            className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-md"
                          >
                            {g}
                            <button
                              type="button"
                              onClick={() => setAgentGuardrails((prev) => prev.filter((x) => x !== g))}
                              className="text-muted-foreground hover:text-destructive ml-1"
                              aria-label="Remover"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground italic">
                  Os limites entram como instruções <strong>negativas</strong> no prompt do agente. Em cada conversa,
                  ele lê esses limites antes de responder. Mudou de ideia? Desmarca aqui e salva.
                </p>
              </div>
            )}

            {activeSection === "behavior.cadences" && (
              <CadencesSection agentId={agentId} isFreshNew={!agentId} />
            )}

            {/* ── Canais → Email ── */}
            {activeSection === "channels.email" && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Mail className="w-5 h-5 text-emerald-500" /> Email
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Provedor Resend. Configure aqui pra disparar cadências e mensagens transacionais.
                  </p>
                </div>
                <IntegrationEmailForm />
              </div>
            )}

            {/* ── Canais → WhatsApp ── */}
            {activeSection === "channels.whatsapp" && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#25D366]" /> WhatsApp
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Conta WhatsApp Business via Meta Cloud API. Pra usar pra cadências, vá em <strong>Templates WhatsApp</strong> abaixo.
                  </p>
                </div>
                <IntegrationWhatsAppForm />
              </div>
            )}

            {/* ── Canais → Voz ── */}
            {activeSection === "channels.voice" && (
              <div className="space-y-6 max-w-2xl">
                <div>
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Mic className="w-5 h-5 text-purple-500" /> Voz
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Telefonia (Telnyx) e síntese de voz (ElevenLabs). Configure cada provedor independentemente.
                  </p>
                </div>
                <IntegrationVoiceForm />
              </div>
            )}

            {/* ── Provedores → LLMs ── */}
            {activeSection === "integrations.llms" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Provedores de IA</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Conecte suas chaves de API e ajuste <strong>temperatura</strong>, <strong>max tokens</strong> e <strong>top-p</strong> de cada modelo individualmente. Clique no card do provedor pra configurar.
                  </p>
                </div>
                <IntegrationsGrid
                  providers={LLM_PROVIDERS}
                  variant="card"
                  showTitle={false}
                  onConnectedProvidersChange={setSavedIntegrations}
                  onProviderConfigsChange={setIntegrationConfigs}
                  initialProviderConfigs={integrationConfigs}
                  storageKey={`${storagePrefix || "agent-detail"}-provider-configs`}
                />
              </div>
            )}

            {/* ── Integrações → Conectores ── */}
            {activeSection === "integrations.apis" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Conectores</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Conecte contas e serviços externos (Google, CRMs, agenda) que o agente pode usar durante a conversa.
                  </p>
                </div>

                <IntegrationsGrid
                  providers={SERVICE_PROVIDERS}
                  variant="card"
                  showTitle={false}
                  onConnectedProvidersChange={(providers) => setSavedIntegrations(prev => Array.from(new Set([...prev.filter((provider) => !SERVICE_PROVIDERS.some((service) => service.provider === provider)), ...providers])))}
                  onProviderConfigsChange={(configs) => setIntegrationConfigs(prev => ({ ...prev, ...configs }))}
                  initialProviderConfigs={integrationConfigs}
                  storageKey={`${storagePrefix || "agent-detail"}-provider-configs`}
                />

                {/* MCPs e Webhooks escondidos por enquanto — não implementados.
                    Quando entrarem no roadmap, reabilitar EmptyIntegrationSection. */}
              </div>
            )}

            {/* ── Recursos → Templates Email ── */}
            {activeSection === "resources.email_templates" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Templates de Email</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Layouts reusáveis com assunto, corpo formatado e variáveis. Selecionáveis nas cadências de email.
                  </p>
                </div>
                <EmailTemplatesPanel />
              </div>
            )}

            {/* ── Recursos → Templates WhatsApp ── */}
            {activeSection === "resources.wa_templates" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Templates WhatsApp</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Templates aprovados pela Meta — usados em cadências WhatsApp pra contatar fora da janela de 24h.
                  </p>
                </div>
                <WhatsAppTemplatesPanel />
              </div>
            )}

            {/* ── Configuração → Canais ── */}
            {activeSection === "config.channels" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Canais</h2>
                  <p className="text-sm text-muted-foreground mt-1">Onde seu agente será publicado.</p>
                </div>
                {filteredChannels.map((ch) => {
                  const isSelected = connectedChannels.includes(ch.value);
                  return (
                    <div key={ch.value} className={`flex items-center gap-4 rounded-xl border-2 p-4 transition-all ${isSelected ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                      {ch.logo ? (
                        <img src={ch.logo} alt={ch.label} className="w-8 h-8 rounded-lg object-contain shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : <Globe className="w-8 h-8 text-primary shrink-0" />}
                      <span className="text-sm font-semibold text-foreground flex-1">{ch.label}</span>
                      <Button size="sm" variant={isSelected ? "default" : "outline"} onClick={() => toggleChannel(ch.value)} className="text-xs h-8 gap-1.5">
                        {isSelected ? <><Check className="w-3 h-3" /> Conectado</> : "Conectar"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Sistema → Danger Zone ── */}
            {activeSection === "system.danger" && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-destructive">Danger Zone</h2>
                <p className="text-sm text-muted-foreground">Ações irreversíveis para este agente.</p>
                <div className="rounded-xl border-2 border-destructive/30 p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Excluir agente</h3>
                  <p className="text-xs text-muted-foreground">Esta ação não pode ser desfeita.</p>
                  <Button variant="destructive" size="sm" onClick={() => onDeleteAgent?.()}>Excluir Agente</Button>
                </div>
              </div>
            )}

          </div>
        </ScrollArea>
      </div>

      {/* Dialog de integração agora é gerido pelo IntegrationsGrid */}
    </div>
  );
};

export default AgentRightPanel;
