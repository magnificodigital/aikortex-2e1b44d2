import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Check, Eye, EyeOff, ExternalLink, KeyRound, Settings, Trash2, Sparkles, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface IntegrationProvider {
  label: string;
  provider: string;
  description: string;
  logo: string;
  native?: boolean;
  apiKeyUrl?: string;
  apiKeyUrlLabel?: string;
}

export const LLM_PROVIDERS: IntegrationProvider[] = [
  {
    label: "Aikortex",
    provider: "aikortex",
    description: "IA nativa da plataforma para criação e estruturação de agentes e apps",
    logo: "",
    native: true,
  },
  {
    label: "OpenAI",
    provider: "openai",
    description: "GPT-4o, GPT-4.5, o3 e modelos de linguagem avançados",
    logo: "https://cdn.simpleicons.org/openai",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    apiKeyUrlLabel: "platform.openai.com",
  },
  {
    label: "Anthropic",
    provider: "anthropic",
    description: "Claude Opus 4, Sonnet 4.5, Haiku e modelos seguros de IA",
    logo: "https://cdn.simpleicons.org/anthropic",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    apiKeyUrlLabel: "console.anthropic.com",
  },
  {
    label: "Google Gemini",
    provider: "gemini",
    description: "Gemini 2.5 Pro, Flash e IA multimodal do Google",
    logo: "https://cdn.simpleicons.org/googlegemini",
    apiKeyUrl: "https://aistudio.google.com/apikey",
    apiKeyUrlLabel: "aistudio.google.com",
  },
  {
    label: "ElevenLabs",
    provider: "elevenlabs",
    description: "Voz IA, text-to-speech e clonagem de voz",
    logo: "https://cdn.simpleicons.org/elevenlabs",
    apiKeyUrl: "https://elevenlabs.io/settings/api-keys",
    apiKeyUrlLabel: "elevenlabs.io",
  },
  {
    label: "DeepSeek",
    provider: "deepseek",
    description: "DeepSeek R1, V3 e modelos open-source de alto desempenho",
    logo: "https://registry.npmmirror.com/@lobehub/icons-static-png/1.24.0/files/dark/deepseek-color.png",
    apiKeyUrl: "https://platform.deepseek.com/api_keys",
    apiKeyUrlLabel: "platform.deepseek.com",
  },
];

export const SERVICE_PROVIDERS: IntegrationProvider[] = [
  {
    label: "Telnyx",
    provider: "telnyx",
    description: "Ligações inbound e outbound via telefone real. Cada agência precisa de sua própria conta.",
    logo: "https://cdn.brandfetch.io/idpKX4_j8-/w/400/h/400/theme/dark/icon.jpeg",
    apiKeyUrl: "https://portal.telnyx.com/#/app/api-keys",
    apiKeyUrlLabel: "portal.telnyx.com",
  },
  { label: "Gmail", provider: "gmail", description: "Ler, enviar e compor e-mails.", logo: "https://cdn.simpleicons.org/gmail" },
  { label: "Google Calendar", provider: "google_calendar", description: "Ler e gerenciar eventos.", logo: "https://cdn.simpleicons.org/googlecalendar" },
  { label: "Outlook Calendar", provider: "outlook_calendar", description: "Gerenciar calendário Microsoft.", logo: "https://cdn.simpleicons.org/microsoftoutlook" },
  { label: "Calendly", provider: "calendly", description: "Agendamento automático de reuniões.", logo: "https://cdn.simpleicons.org/calendly" },
  { label: "Google Sheets", provider: "google_sheets", description: "Ler e escrever planilhas.", logo: "https://cdn.simpleicons.org/googlesheets" },
  { label: "Google Drive", provider: "google_drive", description: "Ler, enviar e gerenciar arquivos.", logo: "https://cdn.simpleicons.org/googledrive" },
  { label: "Piperun", provider: "piperun", description: "CRM de vendas e automação.", logo: "https://www.piperun.com/wp-content/uploads/2023/07/favicon-piperun-crm.png" },
  { label: "HubSpot", provider: "hubspot", description: "CRM, marketing e vendas.", logo: "https://cdn.simpleicons.org/hubspot" },
  { label: "RD Station", provider: "rdstation", description: "Automação de marketing e CRM.", logo: "https://cdn.simpleicons.org/rdstation" },
];

export const ALL_PROVIDERS = [...LLM_PROVIDERS, ...SERVICE_PROVIDERS];

/* ── Provider models catalog ── */

const PROVIDER_MODELS: Record<string, { value: string; label: string }[]> = {
  openai: [
    { value: "o3", label: "o3" },
    { value: "o3-mini", label: "o3 Mini" },
    { value: "o1", label: "o1" },
    { value: "o1-mini", label: "o1 Mini" },
    { value: "gpt-4.5-preview", label: "GPT-4.5 Preview" },
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-4", label: "GPT-4" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  anthropic: [
    { value: "claude-opus-4-6", label: "Claude Opus 4" },
    { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.5" },
    { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
    { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
    { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet" },
    { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
  ],
  gemini: [
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ],
  deepseek: [
    { value: "deepseek-r1", label: "DeepSeek R1" },
    { value: "deepseek-chat-v3", label: "DeepSeek V3" },
    { value: "deepseek-r1-distill-70b", label: "DeepSeek R1 Distill 70B" },
  ],
  elevenlabs: [
    { value: "eleven_multilingual_v2", label: "Multilingual v2" },
    { value: "eleven_turbo_v2_5", label: "Turbo v2.5" },
    { value: "eleven_monolingual_v1", label: "Monolingual v1" },
  ],
};

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o",
  anthropic: "claude-sonnet-4-6",
  gemini: "gemini-2.5-flash",
  deepseek: "deepseek-r1",
  elevenlabs: "eleven_multilingual_v2",
};

export interface ProviderConfig {
  defaultModel?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

const KEY_VALIDATORS: Partial<Record<string, (key: string) => boolean>> = {
  openai: (key) => key.startsWith("sk-"),
  openrouter: (key) => key.startsWith("sk-or-"),
  gemini: (key) => key.startsWith("AIza"),
};

function getKeyValidationError(provider: string, apiKey: string) {
  const normalizedKey = apiKey.trim();
  const validator = KEY_VALIDATORS[provider];

  if (!validator || validator(normalizedKey)) return null;

  if (provider === "openai") {
    return "A chave da OpenAI parece inválida. Ela deve começar com 'sk-'.";
  }

  if (provider === "openrouter") {
    return "A chave do OpenRouter parece inválida. Ela deve começar com 'sk-or-'.";
  }

  if (provider === "gemini") {
    return "A chave do Gemini parece inválida. Ela deve começar com 'AIza'.";
  }

  return "A chave informada parece inválida.";
}

const LLM_PROVIDER_IDS = new Set(LLM_PROVIDERS.filter(p => !p.native).map(p => p.provider));

interface IntegrationsGridProps {
  /** Which providers to show. Defaults to ALL_PROVIDERS */
  providers?: IntegrationProvider[];
  /** Filter to only specific provider keys */
  filterProviders?: string[];
  /** Grid columns class override */
  gridClassName?: string;
  /** Show section title */
  showTitle?: boolean;
  /** Custom title */
  title?: string;
  /** Custom subtitle */
  subtitle?: string;
  /** Persist and expose currently connected providers */
  onConnectedProvidersChange?: (providers: string[]) => void;
  /** Persist provider-level configuration outside this component */
  onProviderConfigsChange?: (configs: Record<string, ProviderConfig>) => void;
  /** Initial provider configs when restoring a saved agent/app */
  initialProviderConfigs?: Record<string, ProviderConfig>;
  /** Optional local storage key for provider configs */
  storageKey?: string;
}

export function IntegrationsGrid({
  providers,
  filterProviders,
  gridClassName = "grid grid-cols-1 md:grid-cols-2 gap-1",
  showTitle = true,
  title = "APIs & Provedores de IA",
  subtitle = "Conecte suas chaves de API para habilitar integrações.",
  onConnectedProvidersChange,
  onProviderConfigsChange,
  initialProviderConfigs,
  storageKey = "aikortex-provider-configs",
}: IntegrationsGridProps) {
  const [connectorKeys, setConnectorKeys] = useState<Record<string, { configured: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [dialogProvider, setDialogProvider] = useState<IntegrationProvider | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [publicKeyInput, setPublicKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [providerConfigs, setProviderConfigs] = useState<Record<string, ProviderConfig>>(() => {
    if (initialProviderConfigs) return initialProviderConfigs;
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [dialogConfig, setDialogConfig] = useState<ProviderConfig>({});

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setConnectorKeys({});
      setLoading(false);
      return;
    }

    const { data } = await supabase.from("user_api_keys").select("provider").eq("user_id", user.id);
    const map: Record<string, { configured: boolean }> = {};
    data?.forEach((row: any) => {
      map[row.provider] = { configured: true };
    });
    setConnectorKeys(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (initialProviderConfigs) {
      setProviderConfigs(initialProviderConfigs);
    }
  }, [initialProviderConfigs]);

  useEffect(() => {
    onConnectedProvidersChange?.(
      Object.entries(connectorKeys)
        .filter(([, value]) => value.configured)
        .map(([provider]) => provider)
    );
  }, [connectorKeys, onConnectedProvidersChange]);

  useEffect(() => {
    onProviderConfigsChange?.(providerConfigs);
  }, [providerConfigs, onProviderConfigsChange]);

  let displayProviders = providers || ALL_PROVIDERS;
  if (filterProviders) {
    displayProviders = displayProviders.filter(p => filterProviders.includes(p.provider));
  }

  const connectedCount = displayProviders.filter(p => p.native || connectorKeys[p.provider]?.configured).length;

  const openDialog = (provider: IntegrationProvider) => {
    setKeyInput("");
    setPublicKeyInput("");
    setShowKey(false);
    setDialogConfig(providerConfigs[provider.provider] || {
      defaultModel: DEFAULT_MODELS[provider.provider],
      temperature: 0.7,
      maxTokens: 2048,
      topP: 1,
    });
    setDialogProvider(provider);
  };

  const handleSave = async (keyOnly = false) => {
    if (!dialogProvider) return;
    if (!keyOnly && !keyInput.trim() && !connectorKeys[dialogProvider.provider]?.configured) return;
    const validationError = getKeyValidationError(dialogProvider.provider, keyInput);
    if (keyInput.trim() && validationError) {
      toast.error(validationError);
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Faça login para salvar chaves."); return; }
      if (keyInput.trim()) {
        const { error } = await supabase.from("user_api_keys").upsert(
          { user_id: user.id, provider: dialogProvider.provider, api_key: keyInput.trim() },
          { onConflict: "user_id,provider" }
        );
        if (error) { toast.error("Erro ao salvar chave."); console.error(error); return; }
        setConnectorKeys(prev => ({ ...prev, [dialogProvider.provider]: { configured: true } }));
      }
      // Save public key for Telnyx
      if (dialogProvider.provider === "telnyx" && publicKeyInput.trim()) {
        const { error } = await supabase.from("user_api_keys").upsert(
          { user_id: user.id, provider: "telnyx_public", api_key: publicKeyInput.trim() },
          { onConflict: "user_id,provider" }
        );
        if (error) { toast.error("Erro ao salvar chave pública."); console.error(error); return; }
      }
      const newConfigs = { ...providerConfigs, [dialogProvider.provider]: dialogConfig };
      setProviderConfigs(newConfigs);
      try { localStorage.setItem(storageKey, JSON.stringify(newConfigs)); } catch {}
      setDialogProvider(null);
      setKeyInput("");
      setPublicKeyInput("");
      toast.success(`${dialogProvider.label} ${keyInput.trim() ? "conectado e configurado" : "configurações salvas"} com sucesso!`);
      await load();
    } finally { setSaving(false); }
  };

  const handleTestConnection = async () => {
    if (!dialogProvider) return;
    setTestingConnection(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Faça login primeiro."); return; }
      const { data } = await supabase.from("user_api_keys").select("api_key").eq("user_id", user.id).eq("provider", dialogProvider.provider).maybeSingle();
      if (!data?.api_key) { toast.error("Salve sua API Key primeiro."); return; }
      if (dialogProvider.provider === "elevenlabs") {
        const res = await fetch("https://api.elevenlabs.io/v1/voices", {
          headers: { "xi-api-key": data.api_key },
        });
        if (!res.ok) { toast.error("Chave inválida ou sem permissão."); return; }
        const json = await res.json();
        const count = json.voices?.length || 0;
        toast.success(`Conexão OK! ${count} voz(es) encontrada(s).`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao testar conexão.");
    } finally { setTestingConnection(false); }
  };

  const handleDisconnect = async () => {
    if (!dialogProvider) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("user_api_keys").delete().eq("user_id", user.id).eq("provider", dialogProvider.provider);
      setConnectorKeys(prev => { const next = { ...prev }; delete next[dialogProvider.provider]; return next; });
      setDialogProvider(null);
      setKeyInput("");
      toast.success(`${dialogProvider.label} desconectado.`);
      await load();
    } finally { setSaving(false); }
  };

  const isConnected = (p: IntegrationProvider) => p.native || !!connectorKeys[p.provider]?.configured;
  const isLLMProvider = (p: IntegrationProvider) => LLM_PROVIDER_IDS.has(p.provider);
  const dialogIsLLM = dialogProvider ? isLLMProvider(dialogProvider) : false;
  const dialogModels = dialogProvider ? PROVIDER_MODELS[dialogProvider.provider] || [] : [];
  const dialogIsConnected = dialogProvider ? connectorKeys[dialogProvider.provider]?.configured : false;

  return (
    <>
      <div className="space-y-4">
        {showTitle && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              </div>
              <Badge variant="outline" className="text-xs">
                {connectedCount} conectadas
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </>
        )}
        <div className={gridClassName}>
          {displayProviders.map((p) => {
            const connected = isConnected(p);
            return (
              <div
                key={p.provider}
                className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {p.logo ? (
                    <img
                      src={p.logo}
                      alt={p.label}
                      className="w-7 h-7 rounded object-contain shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-7 h-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{p.label}</p>
                      {connected && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                          <Check className="w-2.5 h-2.5" /> {p.native ? "Nativo" : "Conectado"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                  </div>
                </div>
                {!p.native && (
                  <Button
                    variant={connected ? "outline" : "ghost"}
                    size="sm"
                    className={`text-xs gap-1 shrink-0 ${connected ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    onClick={() => openDialog(p)}
                  >
                    {connected ? (
                      <><Settings className="w-3 h-3" /> Gerenciar</>
                    ) : (
                      "+ Conectar"
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* API Key Dialog */}
      <Dialog open={!!dialogProvider} onOpenChange={(open) => { if (!open) { setDialogProvider(null); setKeyInput(""); setPublicKeyInput(""); setDialogConfig({}); } }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {dialogProvider?.logo && (
                <img src={dialogProvider.logo} alt={dialogProvider.label} className="w-8 h-8 rounded object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <div>
                <DialogTitle className="text-base">
                  {dialogIsConnected ? "Gerenciar" : "Conectar"} {dialogProvider?.label}
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">{dialogProvider?.description}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-2">
          <div className="space-y-5 pt-2">
            {/* API Key Section */}
            <div className="space-y-2.5">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-primary" /> API Key
                {dialogIsConnected && <Badge variant="outline" className="text-[9px] h-4 text-primary">Conectado</Badge>}
              </label>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder={dialogIsConnected ? "Cole uma nova chave para atualizar" : `Cole sua ${dialogProvider?.label} API Key aqui`}
                  className="pr-10 text-sm font-mono"
                />
                <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {dialogProvider?.apiKeyUrl && (
                <p className="text-[11px] text-muted-foreground">
                  Encontre sua API Key em{" "}
                  <a href={dialogProvider.apiKeyUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                    {dialogProvider.apiKeyUrlLabel || dialogProvider.apiKeyUrl} <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              )}
              {!dialogProvider?.apiKeyUrl && (
                <p className="text-[11px] text-muted-foreground">Cole a chave de API fornecida pelo serviço.</p>
              )}
            </div>

            {/* Telnyx Public Key */}
            {dialogProvider?.provider === "telnyx" && (
              <div className="space-y-2.5">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <KeyRound className="w-3.5 h-3.5 text-primary" /> Public Key
                </label>
                <Input
                  type="password"
                  value={publicKeyInput}
                  onChange={(e) => setPublicKeyInput(e.target.value)}
                  placeholder="Cole sua Telnyx Public Key aqui"
                  className="text-sm font-mono"
                />
                <p className="text-[10px] text-muted-foreground">Usada para validação de assinatura dos webhooks.</p>
              </div>
            )}

            {/* ElevenLabs Test Connection */}
            {dialogProvider?.provider === "elevenlabs" && dialogIsConnected && (
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={handleTestConnection} disabled={testingConnection}>
                {testingConnection ? "Testando..." : "Testar conexão"}
              </Button>
            )}

            {/* LLM Configuration Section */}
            {dialogIsLLM && dialogModels.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Settings className="w-3.5 h-3.5 text-primary" /> Configurações do Modelo
                  </h4>

                  {/* Default Model */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Modelo padrão</label>
                    <Select
                      value={dialogConfig.defaultModel || DEFAULT_MODELS[dialogProvider?.provider || ""] || ""}
                      onValueChange={(v) => setDialogConfig(prev => ({ ...prev, defaultModel: v }))}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecione um modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {dialogModels.map((m) => (
                          <SelectItem key={m.value} value={m.value} className="text-xs">{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">Modelo utilizado por padrão nos agentes e apps.</p>
                  </div>

                  {/* Temperature */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">Temperatura</label>
                      <span className="text-xs font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">{(dialogConfig.temperature ?? 0.7).toFixed(1)}</span>
                    </div>
                    <Slider
                      value={[dialogConfig.temperature ?? 0.7]}
                      onValueChange={([v]) => setDialogConfig(prev => ({ ...prev, temperature: v }))}
                      min={0}
                      max={2}
                      step={0.1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>Preciso</span>
                      <span>Criativo</span>
                    </div>
                  </div>

                  {/* Max Tokens */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">Máx. Tokens</label>
                      <span className="text-xs font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">{dialogConfig.maxTokens ?? 2048}</span>
                    </div>
                    <Slider
                      value={[dialogConfig.maxTokens ?? 2048]}
                      onValueChange={([v]) => setDialogConfig(prev => ({ ...prev, maxTokens: v }))}
                      min={256}
                      max={dialogProvider?.provider === "anthropic" ? 8192 : 4096}
                      step={256}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>256</span>
                      <span>{dialogProvider?.provider === "anthropic" ? "8192" : "4096"}</span>
                    </div>
                  </div>

                  {/* Top P */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">Top P</label>
                      <span className="text-xs font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">{(dialogConfig.topP ?? 1).toFixed(1)}</span>
                    </div>
                    <Slider
                      value={[dialogConfig.topP ?? 1]}
                      onValueChange={([v]) => setDialogConfig(prev => ({ ...prev, topP: v }))}
                      min={0}
                      max={1}
                      step={0.05}
                      className="w-full"
                    />
                    <div className="flex justify-between text-[9px] text-muted-foreground">
                      <span>Restrito</span>
                      <span>Diverso</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              {dialogIsConnected ? (
                <Button variant="destructive" size="sm" className="text-xs gap-1.5 h-8" onClick={handleDisconnect} disabled={saving}>
                  <Trash2 className="w-3 h-3" /> Desconectar
                </Button>
              ) : <div />}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8" onClick={() => { setDialogProvider(null); setKeyInput(""); setPublicKeyInput(""); setDialogConfig({}); }}>Cancelar</Button>
                <Button size="sm" className="h-8" onClick={() => handleSave()} disabled={(!keyInput.trim() && !dialogIsConnected) || saving}>
                  {dialogIsConnected ? "Salvar" : "Conectar"}
                </Button>
              </div>
            </div>
          </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default IntegrationsGrid;
