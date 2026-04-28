import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { IntegrationsGrid, LLM_PROVIDERS, SERVICE_PROVIDERS, type ProviderConfig } from "@/components/shared/IntegrationsGrid";
import { Button } from "@/components/ui/button";
import type { AgentType } from "@/types/agent-builder";
import { CHANNELS_BY_AGENT_TYPE, TOOLS_BY_AGENT_TYPE } from "@/types/agent-builder";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User, Zap, Settings2, AlertTriangle, Mic,
  Upload, X, FileText, Image, File, Plus, Globe, Link2, Check, Camera,
  Webhook, KeyRound, Blocks, Eye, EyeOff, ExternalLink, Trash2, Settings, Rocket,
  Youtube, Rss, Map, CloudUpload, Type, ChevronDown, ChevronUp, BookOpen,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import VoiceConfigPanel, { type VoiceConfig, DEFAULT_VOICE_CONFIG } from "./VoiceConfigPanel";

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

const SETTINGS_NAV = [
  { section: "AGENTE", items: [
    { key: "general",      icon: User,      label: "Identidade" },
    { key: "instructions", icon: Settings2, label: "Instruções" },
    { key: "files_nav",    icon: FileText,  label: "Conhecimento" },
    { key: "voice_nav",    icon: Mic,       label: "Voz" },
  ]},
];

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
  agentModel: string;
  onModelChange: (model: string) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onApiKeysChanged?: () => void | Promise<void>;
  onConfigChange?: (config: AgentConfig) => void;
  onSaveAgent?: (config: AgentConfig & { model: string; agentType: string }) => void | Promise<void>;
  onPublish?: () => void | Promise<void>;
  canPublish?: boolean;
  isSaving?: boolean;
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
  agent, agentType, agentModel, onModelChange,
  activeTab, onTabChange, onApiKeysChanged,
  onConfigChange, onSaveAgent, onPublish, canPublish,
  isSaving, storagePrefix, savedConfig, presetData,
  fieldUpdates, onDeleteAgent,
}: Props) => {
  const [rightTab, setRightTab] = useState(activeTab || "agent");

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
  const [connectorKeys,       setConnectorKeys]       = useState<Record<string, { key: string; configured: boolean }>>({});
  const [keyInput,            setKeyInput]            = useState("");
  const [showKey,             setShowKey]             = useState(false);
  const [savingKey,           setSavingKey]           = useState(false);
  const [selectedDialogModel, setSelectedDialogModel] = useState("");
  const currentIntegrationConfigured = connectorDialog ? !!connectorKeys[connectorDialog.label]?.configured : false;
  const shouldShowDialogModels = !!connectorDialog && !!LLM_PROVIDER_MODELS[connectorDialog.label] && currentIntegrationConfigured;

  useEffect(() => {
    const loadKeys = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id);
      if (data) {
        const map: Record<string, { key: string; configured: boolean }> = {};
        data.forEach((row: any) => {
          const label = Object.entries(PROVIDER_MAP).find(([, v]) => v === row.provider)?.[0] || row.provider;
          map[label] = { key: row.api_key, configured: true };
        });
        setConnectorKeys(map);
      }
    };
    loadKeys();
  }, []);

  const handleTabChange = (tab: string) => { setRightTab(tab); onTabChange?.(tab); };
  useEffect(() => { if (activeTab && activeTab !== rightTab) setRightTab(activeTab); }, [activeTab]);

  const handleConnectIntegration = (integration: typeof INTEGRATIONS[0]) => {
    const existing = connectorKeys[integration.label];
    setKeyInput(existing?.configured ? existing.key : "");
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
      setConnectorKeys(prev => ({ ...prev, [connectorDialog.label]: { key: keyInput.trim(), configured: true } }));
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
  const [connectedChannels, setConnectedChannels] = useState<string[]>(() => savedConfig?.channels?.length ? savedConfig.channels : []);
  const [savedIntegrations, setSavedIntegrations] = useState<string[]>(() => savedConfig?.integrations?.length ? savedConfig.integrations : []);
  const [integrationConfigs, setIntegrationConfigs] = useState<Record<string, ProviderConfig>>(() => savedConfig?.integrationConfigs || {});
  const [apiConfig,         setApiConfig]         = useState<ApiConfig>(() =>
    savedConfig?.apiConfig ? { ...DEFAULT_API_CONFIG, ...savedConfig.apiConfig } : DEFAULT_API_CONFIG
  );
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>(() =>
    savedConfig?.voiceConfig ? { ...DEFAULT_VOICE_CONFIG, ...savedConfig.voiceConfig } : { ...DEFAULT_VOICE_CONFIG, agentName: agent.name }
  );

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
    };
    onConfigChangeRef.current?.(config);
  }, [agentName, agentDesc, agentObjective, agentInstructions, agentToneOfVoice, agentGreetingMessage,
      avatarPreview, connectedChannels, savedIntegrations, integrationConfigs, knowledgeFiles, urls, apiConfig, voiceConfig, agent.avatar]);

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
    model: agentModel, agentType,
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

      <Tabs value={rightTab} onValueChange={handleTabChange} className="flex flex-col flex-1 min-h-0">

        {/* ── Aba Agente ── */}
        <TabsContent value="agent" className="flex-1 mt-0 min-h-0 overflow-hidden">
          <div className="flex h-full">
            <div className="w-48 border-r border-border p-4 space-y-4 shrink-0">
              {SETTINGS_NAV.map((section) => (
                <div key={section.section}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{section.section}</p>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button key={item.key} onClick={() => setSettingsNav(item.key)}
                          className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                            settingsNav === item.key ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}>
                          <Icon className="w-4 h-4" />{item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6 max-w-lg space-y-8">

                {/* Identidade */}
                {settingsNav === "general" && (
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
                          {avatarPreview ? (
                            <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                          ) : agent.avatar ? (
                            <img src={agent.avatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Camera className="w-6 h-6 text-muted-foreground" />
                          )}
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
                      <Select value={agentToneOfVoice} onValueChange={setAgentToneOfVoice}>
                        <SelectTrigger className="text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Profissional e Amigável">Profissional e Amigável</SelectItem>
                          <SelectItem value="Formal">Formal</SelectItem>
                          <SelectItem value="Casual e Descontraído">Casual e Descontraído</SelectItem>
                          <SelectItem value="Empático e Acolhedor">Empático e Acolhedor</SelectItem>
                          <SelectItem value="Direto e Objetivo">Direto e Objetivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground">Mensagem de saudação</h3>
                      <Textarea value={agentGreetingMessage} onChange={(e) => setAgentGreetingMessage(e.target.value)}
                        placeholder="Ex: Olá! Sou a assistente virtual. Como posso te ajudar?" className="text-sm min-h-[80px]" />
                    </div>
                  </>
                )}

                {/* Instruções (objetivo + comportamento unificados, estruturados em tópicos) */}
                {settingsNav === "instructions" && (
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

                {/* Arquivos */}
                {settingsNav === "files_nav" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-foreground">Conhecimento</h2>
                        <p className="text-sm text-muted-foreground mt-1">Permita que seu agente use fontes treinadas.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{knowledgeEnabled ? "Ativado" : "Desativado"}</span>
                        <Switch checked={knowledgeEnabled} onCheckedChange={setKnowledgeEnabled} />
                      </div>
                    </div>

                    {knowledgeEnabled && (
                      <div className="space-y-3">

                        {/* ── Fontes da Web ── */}
                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                          <button onClick={() => setKnowledgeSection(knowledgeSection === "web" ? null : "web")}
                            className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Globe className="w-4 h-4 text-primary" /></div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">Fontes da Web</p>
                                <p className="text-xs text-muted-foreground">Websites, vídeos, RSS feeds, sitemaps</p>
                              </div>
                            </div>
                            {knowledgeSection === "web" ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </button>
                          {knowledgeSection === "web" && (
                            <div className="border-t border-border p-4 space-y-4">
                              {/* URL do site */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-muted-foreground" /><p className="text-xs font-semibold text-muted-foreground uppercase">URL do site</p></div>
                                <div className="flex gap-2">
                                  <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://exemplo.com" className="text-sm"
                                    onKeyDown={(e) => e.key === "Enter" && addUrl()} />
                                  <Button size="sm" onClick={addUrl} disabled={!urlInput.trim()} className="shrink-0"><Plus className="w-4 h-4" /></Button>
                                </div>
                                {urls.map((url, i) => (
                                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                                    <Globe className="w-4 h-4 text-primary shrink-0" />
                                    <p className="text-sm text-foreground truncate flex-1">{url}</p>
                                    <button onClick={() => setUrls(urls.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                                  </div>
                                ))}
                              </div>
                              {/* YouTube */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2"><Youtube className="w-3.5 h-3.5 text-red-500" /><p className="text-xs font-semibold text-muted-foreground uppercase">Vídeo do YouTube</p></div>
                                <div className="flex gap-2">
                                  <Input value={youtubeInput} onChange={(e) => setYoutubeInput(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="text-sm"
                                    onKeyDown={(e) => { if (e.key === "Enter" && youtubeInput.trim()) { setYoutubeUrls(prev => [...prev, youtubeInput.trim()]); setYoutubeInput(""); } }} />
                                  <Button size="sm" onClick={() => { if (youtubeInput.trim()) { setYoutubeUrls(prev => [...prev, youtubeInput.trim()]); setYoutubeInput(""); } }} disabled={!youtubeInput.trim()} className="shrink-0"><Plus className="w-4 h-4" /></Button>
                                </div>
                                {youtubeUrls.map((url, i) => (
                                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                                    <Youtube className="w-4 h-4 text-red-500 shrink-0" />
                                    <p className="text-sm text-foreground truncate flex-1">{url}</p>
                                    <button onClick={() => setYoutubeUrls(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                                  </div>
                                ))}
                              </div>
                              {/* RSS */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2"><Rss className="w-3.5 h-3.5 text-orange-500" /><p className="text-xs font-semibold text-muted-foreground uppercase">Feed RSS / Atom</p></div>
                                <div className="flex gap-2">
                                  <Input value={rssInput} onChange={(e) => setRssInput(e.target.value)} placeholder="https://blog.exemplo.com/rss" className="text-sm"
                                    onKeyDown={(e) => { if (e.key === "Enter" && rssInput.trim()) { setRssUrls(prev => [...prev, rssInput.trim()]); setRssInput(""); } }} />
                                  <Button size="sm" onClick={() => { if (rssInput.trim()) { setRssUrls(prev => [...prev, rssInput.trim()]); setRssInput(""); } }} disabled={!rssInput.trim()} className="shrink-0"><Plus className="w-4 h-4" /></Button>
                                </div>
                                {rssUrls.map((url, i) => (
                                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                                    <Rss className="w-4 h-4 text-orange-500 shrink-0" />
                                    <p className="text-sm text-foreground truncate flex-1">{url}</p>
                                    <button onClick={() => setRssUrls(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                                  </div>
                                ))}
                              </div>
                              {/* Sitemap */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2"><Map className="w-3.5 h-3.5 text-blue-500" /><p className="text-xs font-semibold text-muted-foreground uppercase">Sitemap XML</p></div>
                                <div className="flex gap-2">
                                  <Input value={sitemapInput} onChange={(e) => setSitemapInput(e.target.value)} placeholder="https://exemplo.com/sitemap.xml" className="text-sm"
                                    onKeyDown={(e) => { if (e.key === "Enter" && sitemapInput.trim()) { setSitemapUrls(prev => [...prev, sitemapInput.trim()]); setSitemapInput(""); } }} />
                                  <Button size="sm" onClick={() => { if (sitemapInput.trim()) { setSitemapUrls(prev => [...prev, sitemapInput.trim()]); setSitemapInput(""); } }} disabled={!sitemapInput.trim()} className="shrink-0"><Plus className="w-4 h-4" /></Button>
                                </div>
                                {sitemapUrls.map((url, i) => (
                                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                                    <Map className="w-4 h-4 text-blue-500 shrink-0" />
                                    <p className="text-sm text-foreground truncate flex-1">{url}</p>
                                    <button onClick={() => setSitemapUrls(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ── Importação em nuvem ── */}
                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                          <button onClick={() => setKnowledgeSection(knowledgeSection === "cloud" ? null : "cloud")}
                            className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center"><CloudUpload className="w-4 h-4 text-blue-500" /></div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">Importação em Nuvem <span className="text-[10px] font-bold text-primary ml-1.5 bg-primary/10 px-1.5 py-0.5 rounded">PRO</span></p>
                                <p className="text-xs text-muted-foreground">Importe arquivos do armazenamento em nuvem</p>
                              </div>
                            </div>
                            {knowledgeSection === "cloud" ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </button>
                          {knowledgeSection === "cloud" && (
                            <div className="border-t border-border p-4">
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { name: "Google Drive", icon: "📁", color: "text-green-600" },
                                  { name: "Dropbox", icon: "📦", color: "text-blue-600" },
                                  { name: "OneDrive", icon: "☁️", color: "text-blue-500" },
                                  { name: "Box", icon: "📋", color: "text-blue-700" },
                                ].map((provider) => (
                                  <Button key={provider.name} variant="outline" size="sm" className="justify-start gap-2 text-xs h-10" onClick={() => toast.info(`Conexão com ${provider.name} em breve!`)}>
                                    <span className="text-base">{provider.icon}</span> {provider.name}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ── Envio local ── */}
                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                          <button onClick={() => setKnowledgeSection(knowledgeSection === "local" ? null : "local")}
                            className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center"><Upload className="w-4 h-4 text-green-500" /></div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">Envio Local</p>
                                <p className="text-xs text-muted-foreground">PDF, DOCX, TXT, MD, PPTX, XLSX, CSV, EPUB</p>
                              </div>
                            </div>
                            {knowledgeSection === "local" ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </button>
                          {knowledgeSection === "local" && (
                            <div className="border-t border-border p-4 space-y-3">
                              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}>
                                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                <p className="text-sm font-medium text-foreground">Arraste arquivos ou clique para enviar</p>
                                <p className="text-xs text-muted-foreground mt-1">Máx. 10 MB por arquivo</p>
                                <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.md,.csv,.pptx,.xlsx,.epub" className="hidden"
                                  onChange={(e) => e.target.files && handleFiles(e.target.files)} />
                              </div>
                              {knowledgeFiles.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase">Arquivos enviados</p>
                                  {knowledgeFiles.map((f) => (
                                    <div key={f.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                                      {getFileIcon(f.type)}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm text-foreground truncate">{f.name}</p>
                                        {f.size > 0 && <p className="text-[11px] text-muted-foreground">{formatSize(f.size)}</p>}
                                      </div>
                                      <button onClick={() => setKnowledgeFiles(prev => prev.filter(x => x.id !== f.id))}
                                        className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* ── Texto personalizado ── */}
                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                          <button onClick={() => setKnowledgeSection(knowledgeSection === "text" ? null : "text")}
                            className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center"><Type className="w-4 h-4 text-purple-500" /></div>
                              <div>
                                <p className="text-sm font-semibold text-foreground">Texto Personalizado</p>
                                <p className="text-xs text-muted-foreground">FAQs, guias ou qualquer conteúdo em texto</p>
                              </div>
                            </div>
                            {knowledgeSection === "text" ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </button>
                          {knowledgeSection === "text" && (
                            <div className="border-t border-border p-4 space-y-3">
                              <Textarea value={customTextInput} onChange={(e) => setCustomTextInput(e.target.value)}
                                placeholder="Cole FAQs, guias, instruções ou qualquer conteúdo em markdown..." className="text-sm min-h-[120px]" />
                              <Button size="sm" onClick={() => { if (customTextInput.trim()) { setCustomTexts(prev => [...prev, customTextInput.trim()]); setCustomTextInput(""); toast.success("Texto adicionado!"); } }}
                                disabled={!customTextInput.trim()} className="gap-1.5"><Plus className="w-4 h-4" /> Adicionar texto</Button>
                              {customTexts.length > 0 && (
                                <div className="space-y-2">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase">Textos adicionados</p>
                                  {customTexts.map((text, i) => (
                                    <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
                                      <BookOpen className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                                      <p className="text-sm text-foreground flex-1 line-clamp-2">{text}</p>
                                      <button onClick={() => setCustomTexts(prev => prev.filter((_, j) => j !== i))}
                                        className="text-muted-foreground hover:text-destructive shrink-0"><X className="w-4 h-4" /></button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </div>
                )}

                {/* Voz */}
                {settingsNav === "voice_nav" && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Configurações de Voz</h2>
                      <p className="text-sm text-muted-foreground mt-1">Personalize a voz e o comportamento do agente em chamadas.</p>
                    </div>

                    {/* Warning: ElevenLabs not configured */}
                    {!connectorKeys["ElevenLabs"]?.configured && (
                      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-foreground">Configure sua chave da ElevenLabs em Integrações para ativar ligações com voz.</p>
                          <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary" onClick={() => handleTabChange("connectors")}>
                            Ir para Integrações
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Warning: Telnyx not configured */}
                    {!connectorKeys["Telnyx"]?.configured && (
                      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-foreground">Configure sua chave da Telnyx em Integrações para ativar ligações por telefone.</p>
                          <Button variant="link" size="sm" className="h-auto p-0 text-xs text-primary" onClick={() => handleTabChange("connectors")}>
                            Ir para Integrações
                          </Button>
                        </div>
                      </div>
                    )}

                    <VoiceConfigPanel config={voiceConfig} onChange={setVoiceConfig} />
                  </div>
                )}

              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* ── Aba Integrações ── */}
        <TabsContent value="connectors" className="flex-1 mt-0 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-foreground">Integrações</h2>
                <p className="text-sm text-muted-foreground mt-1">Conecte integrações para expandir as capacidades do agente.</p>
              </div>

              <IntegrationsGrid
                providers={LLM_PROVIDERS}
                title="Modelos de IA (LLMs)"
                subtitle="Conecte suas chaves de API para utilizar modelos de IA."
                onConnectedProvidersChange={setSavedIntegrations}
                onProviderConfigsChange={setIntegrationConfigs}
                initialProviderConfigs={integrationConfigs}
                storageKey={`${storagePrefix || "agent-detail"}-provider-configs`}
              />

              <IntegrationsGrid
                providers={SERVICE_PROVIDERS}
                title="Serviços & Ferramentas"
                subtitle="Conecte serviços externos para expandir as capacidades."
                onConnectedProvidersChange={(providers) => setSavedIntegrations(prev => Array.from(new Set([...prev.filter((provider) => !SERVICE_PROVIDERS.some((service) => service.provider === provider)), ...providers]))) }
                onProviderConfigsChange={(configs) => setIntegrationConfigs(prev => ({ ...prev, ...configs }))}
                initialProviderConfigs={integrationConfigs}
                storageKey={`${storagePrefix || "agent-detail"}-provider-configs`}
              />

              <div className="space-y-2">
                <div className="flex items-center gap-2"><Blocks className="w-4 h-4 text-primary" /><h3 className="text-sm font-semibold">MCPs</h3></div>
                <p className="text-xs text-muted-foreground">Conecte servidores MCP para estender o contexto.</p>
                <Button variant="outline" size="sm" className="text-xs gap-1.5"><Plus className="w-3 h-3" /> Adicionar MCP</Button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2"><Webhook className="w-4 h-4 text-primary" /><h3 className="text-sm font-semibold">Webhooks</h3></div>
                <Button variant="outline" size="sm" className="text-xs gap-1.5"><Plus className="w-3 h-3" /> Adicionar Webhook</Button>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ── Aba Canais ── */}
        <TabsContent value="channels" className="flex-1 mt-0 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 max-w-lg space-y-6">
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
          </ScrollArea>
        </TabsContent>

        <TabsContent value="danger" className="flex-1 mt-0 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 max-w-lg space-y-4">
              <h2 className="text-lg font-bold text-destructive">Danger Zone</h2>
              <p className="text-sm text-muted-foreground">Ações irreversíveis para este agente.</p>
              <div className="rounded-xl border-2 border-destructive/30 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Excluir agente</h3>
                <p className="text-xs text-muted-foreground">Esta ação não pode ser desfeita.</p>
                <Button variant="destructive" size="sm" onClick={() => onDeleteAgent?.()}>Excluir Agente</Button>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Dialog de integração agora é gerido pelo IntegrationsGrid */}
    </div>
  );
};

export default AgentRightPanel;
