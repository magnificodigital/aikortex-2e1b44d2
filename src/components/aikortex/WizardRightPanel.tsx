import { useState, useRef, useEffect } from "react";
import { IntegrationsGrid, LLM_PROVIDERS, SERVICE_PROVIDERS } from "@/components/shared/IntegrationsGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  User, Target, MessageSquare, Layers, Settings2,
  Upload, X, FileText, Image, File, Plus, Check, GripVertical, Trash2,
  ChevronDown, ChevronUp, Shield, ArrowRightLeft, Ban, Clock, Mic, Sparkles,
  AlertTriangle, Globe, Link2, Camera, Webhook, KeyRound, Blocks,
  Eye, EyeOff, ExternalLink, Settings,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

const LLM_PROVIDER_MODELS: Record<string, { models: { value: string; label: string; desc: string }[]; capabilities: string[] }> = {
  OpenAI: {
    models: [
      { value: "gpt-5.2", label: "GPT-5.2", desc: "Mais recente. Raciocínio aprimorado e resolução de problemas complexos." },
      { value: "gpt-5", label: "GPT-5", desc: "Poderoso. Raciocínio complexo, contexto longo e multimodal." },
      { value: "gpt-5-mini", label: "GPT-5 Mini", desc: "Equilíbrio entre custo e desempenho." },
      { value: "gpt-5-nano", label: "GPT-5 Nano", desc: "Mais rápido e econômico para tarefas simples." },
      { value: "gpt-4o", label: "GPT-4o", desc: "Multimodal com visão e áudio." },
      { value: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Versão leve do GPT-4o." },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo", desc: "Contexto de 128K tokens com visão." },
      { value: "gpt-4", label: "GPT-4", desc: "Modelo clássico de raciocínio avançado." },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", desc: "Rápido e econômico para tarefas simples." },
    ],
    capabilities: ["Chat e completions", "Visão (imagens)", "Function calling", "JSON mode", "Embeddings", "Text-to-speech", "Speech-to-text"],
  },
  Anthropic: {
    models: [
      { value: "claude-4-sonnet", label: "Claude 4 Sonnet", desc: "Mais inteligente e versátil." },
      { value: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet", desc: "Excelente raciocínio e código." },
      { value: "claude-3-opus", label: "Claude 3 Opus", desc: "Mais poderoso da família Claude 3." },
      { value: "claude-3-haiku", label: "Claude 3 Haiku", desc: "Rápido e econômico." },
    ],
    capabilities: ["Chat e completions", "Visão (imagens)", "Function calling", "Contexto de 200K tokens"],
  },
  Gemini: {
    models: [
      { value: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", desc: "Mais recente. Raciocínio de próxima geração." },
      { value: "gemini-3-flash-preview", label: "Gemini 3 Flash", desc: "Rápido e capaz, próxima geração." },
      { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", desc: "Top-tier com raciocínio avançado." },
      { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "Rápido e equilibrado." },
      { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite", desc: "Mais econômico para tarefas simples." },
    ],
    capabilities: ["Chat e completions", "Visão (imagens e vídeo)", "Function calling", "Contexto de 1M tokens", "Geração de imagens"],
  },
};
import type {
  BusinessContext, AgentRecommendation, DeployChannel, ExternalTool,
  AgentIntent, ConversationStage, AgentAdvancedConfig, CRMProvider,
  KnowledgeFile, MessageSize, CreativityLevel,
  AgentIntent as AgentIntentType, ConversationStage as ConversationStageType,
} from "@/types/agent-builder";
import { MANDATORY_INTENTS, CUSTOM_INTENT_SUGGESTIONS } from "@/types/agent-builder";
import { MOCK_CLIENTS } from "@/types/client";

const INTEGRATIONS = [
  { label: "OpenAI", desc: "Modelos GPT para geração de texto e análise.", logo: "https://cdn.simpleicons.org/openai" },
  { label: "Anthropic", desc: "Modelos Claude para raciocínio avançado.", logo: "https://cdn.simpleicons.org/anthropic" },
  { label: "Gemini", desc: "IA multimodal do Google.", logo: "https://cdn.simpleicons.org/googlegemini" },
  { label: "ElevenLabs", desc: "Geração de voz e text-to-speech.", logo: "https://cdn.simpleicons.org/elevenlabs" },
  { label: "OpenRouter", desc: "Acesso unificado a múltiplos LLMs.", logo: "https://openrouter.ai/favicon.ico" },
  { label: "Gmail", desc: "Ler, enviar e compor e-mails.", logo: "https://cdn.simpleicons.org/gmail" },
  { label: "Google Calendar", desc: "Ler e gerenciar eventos.", logo: "https://cdn.simpleicons.org/googlecalendar" },
  { label: "Outlook Calendar", desc: "Gerenciar calendário Microsoft.", logo: "https://cdn.simpleicons.org/microsoftoutlook" },
  { label: "Calendly", desc: "Agendamento automático de reuniões.", logo: "https://cdn.simpleicons.org/calendly" },
  { label: "Google Sheets", desc: "Ler e escrever planilhas.", logo: "https://cdn.simpleicons.org/googlesheets" },
  { label: "Google Drive", desc: "Ler, enviar e gerenciar arquivos.", logo: "https://cdn.simpleicons.org/googledrive" },
  { label: "Piperun", desc: "CRM de vendas e automação.", logo: "https://www.piperun.com/wp-content/uploads/2023/07/favicon-piperun-crm.png" },
  { label: "HubSpot", desc: "CRM, marketing e vendas.", logo: "https://cdn.simpleicons.org/hubspot" },
  { label: "RD Station", desc: "Automação de marketing e CRM.", logo: "https://cdn.simpleicons.org/rdstation" },
];

const CHANNELS = [
  { value: "whatsapp", label: "WhatsApp", logo: "https://cdn.simpleicons.org/whatsapp" },
  { value: "instagram", label: "Instagram", logo: "https://cdn.simpleicons.org/instagram" },
  { value: "facebook", label: "Facebook", logo: "https://cdn.simpleicons.org/facebook" },
  { value: "linkedin", label: "LinkedIn", logo: "https://cdn.simpleicons.org/linkedin" },
  { value: "tiktok", label: "TikTok", logo: "https://cdn.simpleicons.org/tiktok" },
  { value: "website", label: "WebSite", logo: "" },
];

type SettingsNavKey = "identidade" | "objetivo" | "intencoes" | "estagios" | "avancado";

const SETTINGS_NAV = [
  {
    items: [
      { key: "identidade" as SettingsNavKey, icon: User, label: "Identidade" },
      { key: "objetivo" as SettingsNavKey, icon: Target, label: "Objetivo" },
      { key: "intencoes" as SettingsNavKey, icon: MessageSquare, label: "Ações" },
      { key: "estagios" as SettingsNavKey, icon: Layers, label: "Estágios" },
      { key: "avancado" as SettingsNavKey, icon: Settings2, label: "Avançado" },
    ],
  },
];

const MODEL_GATED_PROVIDERS = new Set(["OpenAI"]);

const TONES = [
  "Profissional e amigável", "Formal e corporativo", "Casual e descontraído",
  "Consultivo e técnico", "Empático e acolhedor",
];

const INDUSTRIES = [
  "Tecnologia", "SaaS", "E-commerce", "Marketing Digital", "Consultoria",
  "Educação", "Saúde", "Financeiro", "Imobiliário", "Varejo", "Outro",
];

const INTENT_ICONS: Record<string, typeof Shield> = {
  end_conversation: Ban, transfer_human: ArrowRightLeft,
  invalid_content: AlertTriangle, response_limit: Clock,
};

interface Props {
  context: BusinessContext;
  onContextChange: (ctx: BusinessContext) => void;
  selectedAgent: AgentRecommendation | null;
  selectedChannels: DeployChannel[];
  onToggleChannel: (ch: DeployChannel) => void;
  selectedTools: ExternalTool[];
  onToggleTool: (tool: ExternalTool) => void;
  selectedCRM: CRMProvider | null;
  onSelectCRM: (crm: CRMProvider | null) => void;
  intents: AgentIntent[];
  onIntentsChange: (intents: AgentIntent[]) => void;
  stages: ConversationStage[];
  onStagesChange: (stages: ConversationStage[]) => void;
  advancedConfig: AgentAdvancedConfig;
  onAdvancedConfigChange: (cfg: AgentAdvancedConfig) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  onApiKeysChanged?: () => void | Promise<void>;
  onSaveAgent?: () => void | Promise<void>;
  isSaving?: boolean;
}

const WizardRightPanel = ({
  context, onContextChange,
  selectedAgent, selectedChannels, onToggleChannel,
  selectedTools, onToggleTool,
  selectedCRM, onSelectCRM,
  intents, onIntentsChange,
  stages, onStagesChange,
  advancedConfig, onAdvancedConfigChange,
  activeTab, onTabChange,
  activeSection, onSectionChange,
  onApiKeysChanged,
  onSaveAgent, isSaving,
}: Props) => {
  const [rightTab, setRightTab] = useState(activeTab || "agent");

  const handleTabChange = (tab: string) => {
    setRightTab(tab);
    onTabChange?.(tab);
  };

  useEffect(() => {
    if (activeTab && activeTab !== rightTab) {
      setRightTab(activeTab);
    }
  }, [activeTab]);

  const [settingsNav, setSettingsNav] = useState<SettingsNavKey>(
    (activeSection as SettingsNavKey) || "identidade"
  );

  // Sync section from parent
  useEffect(() => {
    if (activeSection && activeSection !== settingsNav) {
      setSettingsNav(activeSection as SettingsNavKey);
    }
  }, [activeSection]);
  const [urlInput, setUrlInput] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [expandedIntent, setExpandedIntent] = useState<string | null>(null);
  const [newIntentName, setNewIntentName] = useState("");
  const [newIntentAction, setNewIntentAction] = useState("");
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [newStageName, setNewStageName] = useState("");

  // Connector dialog state
  const PROVIDER_MAP: Record<string, string> = {
    "OpenAI": "openai", "Anthropic": "anthropic", "Gemini": "gemini",
    "ElevenLabs": "elevenlabs", "OpenRouter": "openrouter", "Gmail": "gmail",
    "Google Calendar": "google_calendar", "Outlook Calendar": "outlook_calendar",
    "Calendly": "calendly", "Google Sheets": "google_sheets",
    "Google Drive": "google_drive", "Piperun": "piperun",
    "HubSpot": "hubspot", "RD Station": "rdstation",
  };
  const [connectorDialog, setConnectorDialog] = useState<null | typeof INTEGRATIONS[0]>(null);
  const [connectorKeys, setConnectorKeys] = useState<Record<string, { key: string; configured: boolean }>>({});
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [selectedDialogModel, setSelectedDialogModel] = useState("");
  const currentIntegrationConfigured = connectorDialog ? !!connectorKeys[connectorDialog.label]?.configured : false;
  const shouldShowDialogModels = !!connectorDialog && !!LLM_PROVIDER_MODELS[connectorDialog.label] && (!MODEL_GATED_PROVIDERS.has(connectorDialog.label) || currentIntegrationConfigured);

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

  const handleConnectIntegration = (integration: typeof INTEGRATIONS[0]) => {
    const existing = connectorKeys[integration.label];
    setKeyInput(existing?.configured ? existing.key : "");
    setShowKey(false);
    const providerModels = LLM_PROVIDER_MODELS[integration.label];
    setSelectedDialogModel(providerModels?.models[0]?.value || "");
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
      const { error } = await supabase.from("user_api_keys").upsert(
        { user_id: user.id, provider, api_key: keyInput.trim() },
        { onConflict: "user_id,provider" }
      );
      if (error) { toast.error("Erro ao salvar chave."); console.error(error); return; }
      setConnectorKeys(prev => ({ ...prev, [connectorDialog.label]: { key: keyInput.trim(), configured: true } }));
      await onApiKeysChanged?.();
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

  const update = (field: keyof BusinessContext, value: string) =>
    onContextChange({ ...context, [field]: value });

  const handleFiles = (files: FileList) => {
    const newFiles: KnowledgeFile[] = Array.from(files)
      .filter((f) => f.size <= 10 * 1024 * 1024)
      .map((f) => ({ id: crypto.randomUUID(), name: f.name, size: f.size, type: f.type }));
    onContextChange({ ...context, knowledgeFiles: [...context.knowledgeFiles, ...newFiles] });
  };
  const removeFile = (id: string) => onContextChange({ ...context, knowledgeFiles: context.knowledgeFiles.filter((f) => f.id !== id) });
  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="w-4 h-4 text-primary shrink-0" />;
    if (type === "application/pdf") return <FileText className="w-4 h-4 text-destructive shrink-0" />;
    return <File className="w-4 h-4 text-muted-foreground shrink-0" />;
  };
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
    // Show immediate preview
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    // Upload to storage
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Faça login para enviar imagens."); return; }
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/agent-avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("agent-avatars").upload(path, file, { upsert: true });
      if (error) { toast.error("Erro ao enviar imagem."); console.error(error); return; }
      const { data: urlData } = supabase.storage.from("agent-avatars").getPublicUrl(path);
      if (urlData?.publicUrl) {
        setAvatarPreview(urlData.publicUrl);
        toast.success("Avatar atualizado!");
      }
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error("Erro ao enviar avatar.");
    }
  };

  const customIntents = intents.filter((i) => !i.isMandatory);
  const canAddIntent = customIntents.length < 10;
  const addCustomIntent = () => {
    if (!newIntentName.trim() || !canAddIntent) return;
    onIntentsChange([...intents, { id: crypto.randomUUID(), name: newIntentName.trim(), description: "", triggers: [], action: newIntentAction.trim() || newIntentName.trim(), isMandatory: false }]);
    setNewIntentName(""); setNewIntentAction("");
  };
  const addSuggestedIntent = (s: { name: string; action: string }) => {
    if (!canAddIntent || intents.some((i) => i.name === s.name)) return;
    onIntentsChange([...intents, { id: crypto.randomUUID(), name: s.name, description: "", triggers: [], action: s.action, isMandatory: false }]);
  };
  const removeIntent = (id: string) => onIntentsChange(intents.filter((i) => i.id !== id));
  const canAddStage = stages.length < 10;
  const addStage = () => {
    if (!newStageName.trim() || !canAddStage) return;
    onStagesChange([...stages, { id: crypto.randomUUID(), name: newStageName.trim(), description: "", example: "", order: stages.length + 1 }]);
    setNewStageName("");
  };
  const removeStage = (id: string) => onStagesChange(stages.filter((s) => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })));
  const moveStage = (id: string, direction: "up" | "down") => {
    const idx = stages.findIndex((s) => s.id === id);
    if ((direction === "up" && idx === 0) || (direction === "down" && idx === stages.length - 1)) return;
    const ns = [...stages]; const si = direction === "up" ? idx - 1 : idx + 1;
    [ns[idx], ns[si]] = [ns[si], ns[idx]];
    onStagesChange(ns.map((s, i) => ({ ...s, order: i + 1 })));
  };
  const updateStage = (id: string, field: keyof ConversationStageType, value: string) =>
    onStagesChange(stages.map((s) => s.id === id ? { ...s, [field]: value } : s));

  const SECTION_TITLES: Record<string, { title: string; desc: string }> = {
    identidade: { title: "Identidade", desc: "Identidade, propósito e modelo de IA do agente." },
    objetivo: { title: "Objetivo", desc: "O que este agente faz e qual o resultado esperado." },
    intencoes: { title: "Ações", desc: "Ações que o agente pode realizar durante a conversa." },
    estagios: { title: "Estágios", desc: "Fluxo de conversa que o agente segue." },
    avancado: { title: "Avançado", desc: "Configurações de comportamento e limites." },
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">
      <Tabs value={rightTab} onValueChange={handleTabChange} className="flex flex-col flex-1 overflow-hidden">
        <div className="border-b border-border px-4">
          <TabsList className="bg-transparent h-11 gap-0 p-0 w-full justify-between">
            <div className="flex">
            {[
              { value: "agent", label: "Agente" },
              { value: "connectors", label: "Integrações" },
              { value: "files", label: "Arquivos" },
              { value: "settings", label: "Canais" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 text-sm"
              >
                {tab.label}
              </TabsTrigger>
            ))}
            </div>
            <Button
              size="sm"
              className="gap-1.5 h-7 text-xs my-auto"
              onClick={() => onSaveAgent?.()}
              disabled={!context.agentName?.trim() || isSaving}
            >
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </TabsList>
        </div>

        {/* Integrações — usando componente compartilhado */}
        <TabsContent value="connectors" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-foreground">Integrações</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Conecte integrações para expandir as capacidades do seu agente.
                </p>
              </div>

              <IntegrationsGrid
                providers={LLM_PROVIDERS}
                title="Modelos de IA (LLMs)"
                subtitle="Conecte suas chaves de API para utilizar modelos de IA."
              />

              <IntegrationsGrid
                providers={SERVICE_PROVIDERS}
                title="Serviços & Ferramentas"
                subtitle="Conecte serviços externos para expandir as capacidades."
              />

              {/* MCPs */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Blocks className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">MCPs</h3>
                </div>
                <p className="text-xs text-muted-foreground">Conecte servidores MCP para estender o contexto do agente.</p>
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <Plus className="w-3 h-3" /> Adicionar MCP
                </Button>
              </div>

              {/* Webhooks */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Webhook className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Webhooks</h3>
                </div>
                <p className="text-xs text-muted-foreground">Configure webhooks para receber e enviar eventos em tempo real.</p>
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <Plus className="w-3 h-3" /> Adicionar Webhook
                </Button>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Arquivos - Knowledge */}
        <TabsContent value="files" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-foreground">Conhecimento</h2>
                <p className="text-sm text-muted-foreground mt-1">Fontes de dados para alimentar o agente.</p>
              </div>

              {/* Drop zone */}
              <div
                className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files); }}
              >
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">Arraste arquivos ou clique para enviar</p>
                <p className="text-xs text-muted-foreground mt-1">PDFs, documentos, FAQ, Notion, Google Drive</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,.xlsx"
                  className="hidden"
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                />
              </div>

              {/* File list */}
              {context.knowledgeFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Arquivos enviados</p>
                  {context.knowledgeFiles.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
                      {getFileIcon(f.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{f.name}</p>
                        <p className="text-[11px] text-muted-foreground">{formatSize(f.size)}</p>
                      </div>
                      <button onClick={() => removeFile(f.id)} className="text-muted-foreground hover:text-destructive">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* URL input */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">URLs</p>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Link2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://exemplo.com/faq"
                      className="pl-9"
                      onKeyDown={(e) => e.key === "Enter" && addUrl()}
                    />
                  </div>
                  <Button size="sm" onClick={addUrl} disabled={!urlInput.trim()} className="gap-1 shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {urls.map((url, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
                    <Globe className="w-4 h-4 text-primary shrink-0" />
                    <p className="text-sm text-foreground truncate flex-1">{url}</p>
                    <button onClick={() => setUrls(urls.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Agent — with sidebar navigation */}
        <TabsContent value="agent" className="flex-1 mt-0 overflow-hidden">
          <div className="flex h-full">
            <div className="w-48 border-r border-border p-4 space-y-4 shrink-0">
              {SETTINGS_NAV.map((section, sIdx) => (
                <div key={sIdx}>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.key}
                          onClick={() => {
                            setSettingsNav(item.key);
                            onSectionChange?.(item.key);
                          }}
                          className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                            settingsNav === item.key
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6">
                <div className="max-w-lg space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{SECTION_TITLES[settingsNav]?.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{SECTION_TITLES[settingsNav]?.desc}</p>
                  </div>

                  {settingsNav === "identidade" && (
                    <div className="space-y-6">
                      {/* Avatar upload */}
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground">Avatar</h3>
                        <div className="flex items-center gap-4">
                          <div
                            className="w-16 h-16 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                            onClick={() => avatarInputRef.current?.click()}
                          >
                            {avatarPreview ? (
                              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <Camera className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <Button variant="outline" size="sm" onClick={() => avatarInputRef.current?.click()} className="text-xs">
                              Enviar foto
                            </Button>
                            <p className="text-[11px] text-muted-foreground mt-1">JPEG, PNG ou WebP · até 5 MB</p>
                          </div>
                          <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleAvatarChange}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground">Nome do agente</h3>
                        <Input value={context.agentName} onChange={(e) => update("agentName", e.target.value)} placeholder="Ex: Ivy, Sofia, Max..." />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground">Cargo / Função</h3>
                        <Input value={context.mainProduct} onChange={(e) => update("mainProduct", e.target.value)} placeholder="Ex: SDR, Atendente, Consultor..." />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground">Empresa</h3>
                        <Select
                          value={context.companyName ? MOCK_CLIENTS.find(c => c.companyName === context.companyName)?.id || "" : ""}
                          onValueChange={(clientId) => {
                            const client = MOCK_CLIENTS.find(c => c.id === clientId);
                            if (client) {
                              onContextChange({ ...context, companyName: client.companyName, website: client.website ? `https://${client.website}` : "", industry: client.industry || "" });
                            }
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="Escolha um cliente cadastrado" /></SelectTrigger>
                          <SelectContent>
                            {MOCK_CLIENTS.filter(c => c.status === "active" || c.status === "onboarding").map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.companyName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground">Tom de voz</h3>
                        <Select value={context.toneOfVoice} onValueChange={(v) => update("toneOfVoice", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{TONES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground">Mensagem de saudação</h3>
                        <Textarea
                          value={context.greetingMessage}
                          onChange={(e) => update("greetingMessage", e.target.value)}
                          placeholder="Ex: Olá! 👋 Sou a Ivy, assistente virtual..."
                          className="min-h-[80px]"
                        />
                      </div>
                    </div>
                  )}

                  {settingsNav === "objetivo" && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground">O que este agente faz?</h3>
                        <p className="text-xs text-muted-foreground">Define o propósito principal. Carregado no system prompt.</p>
                        <Textarea value={context.targetAudienceDescription} onChange={(e) => update("targetAudienceDescription", e.target.value)} placeholder="Ex: Este agente conversa com visitantes do site para entender seu interesse..." className="min-h-[100px]" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground">Resultado esperado</h3>
                        <Textarea value={context.painPoints} onChange={(e) => update("painPoints", e.target.value)} placeholder="Ex: Lead qualificado com reunião agendada..." className="min-h-[80px]" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-foreground">Público atendido</h3>
                        <Textarea value={context.knowledgeSources} onChange={(e) => update("knowledgeSources", e.target.value)} placeholder="Ex: PMEs de tecnologia, decisores C-level..." className="min-h-[80px]" />
                      </div>
                    </div>
                  )}

                  {settingsNav === "intencoes" && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Intenções obrigatórias</p>
                        {MANDATORY_INTENTS.map((intent) => {
                          const Icon = INTENT_ICONS[intent.id] || Shield;
                          const isExpanded = expandedIntent === intent.id;
                          return (
                            <div key={intent.id} className="rounded-lg border border-border bg-muted/20">
                              <button onClick={() => setExpandedIntent(isExpanded ? null : intent.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-primary" /></div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground">{intent.name}</span>
                                    <Badge variant="outline" className="text-[9px]">Obrigatória</Badge>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground truncate">{intent.description}</p>
                                </div>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                              </button>
                              {isExpanded && (
                                <div className="px-4 pb-3 space-y-2 border-t border-border pt-3">
                                  <div className="space-y-1"><Label className="text-[11px]">Quando ativar:</Label><div className="flex flex-wrap gap-1">{intent.triggers.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}</div></div>
                                  <div className="space-y-1"><Label className="text-[11px]">Ação:</Label><p className="text-xs text-foreground">{intent.action}</p></div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Personalizadas</p>
                          <span className="text-[10px] text-muted-foreground">{customIntents.length}/10</span>
                        </div>
                        {customIntents.map((intent) => (
                          <div key={intent.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3">
                            <Sparkles className="w-4 h-4 text-primary shrink-0" />
                            <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground">{intent.name}</p><p className="text-[11px] text-muted-foreground">{intent.action}</p></div>
                            <button onClick={() => removeIntent(intent.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        ))}
                        <div className="flex flex-wrap gap-1.5">
                          {CUSTOM_INTENT_SUGGESTIONS.filter((s) => !intents.some((i) => i.name === s.name)).map((s) => (
                            <button key={s.name} onClick={() => addSuggestedIntent(s)} disabled={!canAddIntent} className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all disabled:opacity-50">+ {s.name}</button>
                          ))}
                        </div>
                        {canAddIntent && (
                          <div className="flex gap-2 pt-1">
                            <Input placeholder="Nome" value={newIntentName} onChange={(e) => setNewIntentName(e.target.value)} className="flex-1" />
                            <Input placeholder="Ação" value={newIntentAction} onChange={(e) => setNewIntentAction(e.target.value)} className="flex-1" />
                            <Button size="sm" onClick={addCustomIntent} disabled={!newIntentName.trim()} className="gap-1 shrink-0"><Plus className="w-4 h-4" /></Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {settingsNav === "estagios" && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Ordem da conversa.</p>
                        <span className="text-[10px] text-muted-foreground">{stages.length}/10</span>
                      </div>
                      {stages.map((stage, idx) => {
                        const isExp = expandedStage === stage.id;
                        return (
                          <div key={stage.id} className="rounded-lg border border-border bg-card">
                            <div className="flex items-center gap-2 px-3 py-2.5">
                              <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                              <button onClick={() => setExpandedStage(isExp ? null : stage.id)} className="flex-1 text-left">
                                <span className="text-sm font-medium text-foreground">{stage.name}</span>
                              </button>
                              <div className="flex items-center gap-1">
                                <button onClick={() => moveStage(stage.id, "up")} disabled={idx === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                                <button onClick={() => moveStage(stage.id, "down")} disabled={idx === stages.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                                <button onClick={() => removeStage(stage.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                            {isExp && (
                              <div className="px-4 pb-3 space-y-2 border-t border-border pt-3">
                                <Input value={stage.description} onChange={(e) => updateStage(stage.id, "description", e.target.value)} placeholder="Descrição..." />
                                <Textarea value={stage.example} onChange={(e) => updateStage(stage.id, "example", e.target.value)} placeholder="Exemplo..." rows={2} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {canAddStage && (
                        <div className="flex gap-2">
                          <Input placeholder="Novo estágio..." value={newStageName} onChange={(e) => setNewStageName(e.target.value)} />
                          <Button size="sm" onClick={addStage} disabled={!newStageName.trim()} className="gap-1 shrink-0"><Plus className="w-4 h-4" /></Button>
                        </div>
                      )}
                    </div>
                  )}

                  {settingsNav === "avancado" && (
                    <div className="space-y-5">
                      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                        <div className="flex items-center justify-between"><div><Label className="text-sm font-medium">Max respostas</Label><p className="text-[11px] text-muted-foreground">Evita loops.</p></div><Badge variant="outline" className="text-sm font-mono">{advancedConfig.maxResponses}</Badge></div>
                        <Slider value={[advancedConfig.maxResponses]} onValueChange={([v]) => onAdvancedConfigChange({ ...advancedConfig, maxResponses: v })} min={10} max={100} step={5} />
                      </div>
                      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
                        <Label className="text-sm font-medium">Tamanho das mensagens</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {([{ value: "short" as MessageSize, label: "Curtas" }, { value: "medium" as MessageSize, label: "Médias" }, { value: "long" as MessageSize, label: "Longas" }]).map((opt) => (
                            <button key={opt.value} onClick={() => onAdvancedConfigChange({ ...advancedConfig, messageSize: opt.value })} className={`rounded-lg border p-3 text-center transition-all ${advancedConfig.messageSize === opt.value ? "border-primary bg-primary/5 text-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}>
                              <p className="text-xs font-medium">{opt.label}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
                        <div><Label className="text-sm font-medium">Responder na transferência</Label></div>
                        <Switch checked={advancedConfig.respondOnTransfer} onCheckedChange={(v) => onAdvancedConfigChange({ ...advancedConfig, respondOnTransfer: v })} />
                      </div>
                      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
                        <div className="flex items-center gap-2"><Mic className="w-4 h-4 text-primary" /><Label className="text-sm font-medium">Responder em áudio</Label></div>
                        <Switch checked={advancedConfig.respondInAudio} onCheckedChange={(v) => onAdvancedConfigChange({ ...advancedConfig, respondInAudio: v })} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        </TabsContent>

        {/* Configurações - Canais */}
        <TabsContent value="settings" className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-6 max-w-lg space-y-6">
              <div>
                <h2 className="text-lg font-bold text-foreground">Canais</h2>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Onde seu agente vai operar?</p>
              </div>
              <div className="space-y-2">
                {CHANNELS.map((ch) => {
                  const isSelected = selectedChannels.includes(ch.value as DeployChannel);
                  return (
                    <div
                      key={ch.value}
                      className={`flex items-center gap-4 rounded-xl border-2 p-4 transition-all ${
                        isSelected ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card"
                      }`}
                    >
                      {ch.logo ? (
                        <img
                          src={ch.logo}
                          alt={ch.label}
                          className="w-8 h-8 rounded-lg object-contain shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <Globe className="w-8 h-8 text-primary shrink-0" />
                      )}
                      <span className="text-sm font-semibold text-foreground flex-1">{ch.label}</span>
                      <Button
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => onToggleChannel(ch.value as DeployChannel)}
                        className="shrink-0 text-xs h-8 gap-1.5"
                      >
                        {isSelected ? (
                          <><Check className="w-3 h-3" /> Conectado</>
                        ) : (
                          "Conectar"
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-border">
                <h2 className="text-lg font-bold text-destructive">Danger Zone</h2>
                <p className="text-sm text-muted-foreground mt-1">Ações irreversíveis para este agente.</p>
                <Button variant="destructive" size="sm" className="mt-4">Excluir Agente</Button>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
      {/* Dialog de integração agora é gerido pelo IntegrationsGrid */}

    </div>
  );
};

export default WizardRightPanel;
