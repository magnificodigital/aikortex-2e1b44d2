import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, Save, CheckCircle2, AlertCircle, ExternalLink, Cpu, Power, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import telnyxLogo from "@/assets/connectors/telnyx-logo.png.asset.json";
import asaasLogoLight from "@/assets/connectors/asaas-light.png.asset.json";
import asaasLogoDark from "@/assets/connectors/asaas-dark.png.asset.json";

interface ConfigField {
  key: string;
  label: string;
  placeholder?: string;
  description: string;
  /** "secret" (default) = input password com eye toggle.
   *  "model" = dropdown com opcoes + "Outro" pra texto livre. */
  type?: "secret" | "model";
  /** Lista de opcoes pro tipo "model". Atualize aqui quando lancarem versao nova. */
  options?: { id: string; label: string }[];
}

// Listas curadas das versoes mais usadas/recentes. Quando o provider lancar
// um modelo novo, basta adicionar aqui (sem mudar nada no DB). Admin tambem
// pode escolher "Outro..." pra digitar id custom.
const MODELS_OPENROUTER: { id: string; label: string }[] = [
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (rápido, barato)" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "anthropic/claude-opus-4-7", label: "Claude Opus 4.7" },
  { id: "anthropic/claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5 (rápido, barato)" },
  { id: "openai/gpt-5", label: "GPT-5" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini (rápido, barato)" },
  { id: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
  { id: "deepseek/deepseek-chat", label: "DeepSeek Chat V3" },
  { id: "deepseek/deepseek-r1", label: "DeepSeek R1 (raciocínio)" },
];

const MODELS_OPENAI: { id: string; label: string }[] = [
  { id: "gpt-5", label: "GPT-5 (mais recente)" },
  { id: "gpt-4.1", label: "GPT-4.1" },
  { id: "gpt-4o", label: "GPT-4o (multimodal, voz, visão)" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini (rápido, barato)" },
  { id: "o3", label: "o3 (raciocínio profundo)" },
  { id: "o3-mini", label: "o3 Mini (raciocínio rápido)" },
];

const MODELS_ANTHROPIC: { id: string; label: string }[] = [
  { id: "claude-opus-4-7", label: "Claude Opus 4.7 (mais inteligente)" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (balanced)" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 (rápido, barato)" },
];

const MODELS_GEMINI: { id: string; label: string }[] = [
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (mais barato)" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
];

const CUSTOM_MODEL_OPTION = "__custom__";

interface ProviderGroup {
  id: string;
  label: string;
  category: "llm" | "voz" | "telefonia" | "comunicacao" | "pagamentos" | "infra";
  description: string;
  logo?: string;
  apiKeyUrl?: string;
  apiKeyUrlLabel?: string;
  fields: ConfigField[];
}

const PROVIDERS: ProviderGroup[] = [
  {
    id: "openrouter",
    label: "OpenRouter",
    category: "llm",
    description: "Gateway que dá acesso a 200+ modelos (Gemini, Llama, DeepSeek, etc.) com uma única chave.",
    logo: "https://openrouter.ai/favicon.ico",
    apiKeyUrl: "https://openrouter.ai/keys",
    apiKeyUrlLabel: "openrouter.ai",
    fields: [
      { key: "openrouter_api_key", label: "API Key", placeholder: "sk-or-...", description: "Usada por todos os usuários Starter/Pro para modelos gratuitos." },
      { key: "openrouter_default_model", label: "Modelo padrão", description: "Qual modelo o gateway usa quando não tem preferência específica do agente.", type: "model", options: MODELS_OPENROUTER },
    ],
  },
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    category: "llm",
    description: "Claude Opus, Sonnet e Haiku — modelos premium para raciocínio profundo.",
    logo: "https://cdn.simpleicons.org/anthropic/_/D97757",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    apiKeyUrlLabel: "console.anthropic.com",
    fields: [
      { key: "anthropic_api_key", label: "API Key", placeholder: "sk-ant-...", description: "Chave padrão para modelos Claude." },
      { key: "anthropic_default_model", label: "Modelo padrão", description: "Versão do Claude usada por padrão.", type: "model", options: MODELS_ANTHROPIC },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    category: "llm",
    description: "GPT-4o, GPT-4.1, GPT-5, o3 e Whisper (transcrição de voz).",
    logo: new URL("@/assets/openai-icon.png", import.meta.url).href,
    apiKeyUrl: "https://platform.openai.com/api-keys",
    apiKeyUrlLabel: "platform.openai.com",
    fields: [
      { key: "openai_api_key", label: "API Key", placeholder: "sk-...", description: "Chave padrão para GPT e Whisper." },
      { key: "openai_default_model", label: "Modelo padrão", description: "Versão do GPT usada por padrão.", type: "model", options: MODELS_OPENAI },
    ],
  },
  {
    id: "gemini",
    label: "Google Gemini",
    category: "llm",
    description: "Gemini 2.5 Pro, Flash e modelos multimodais do Google.",
    logo: "https://cdn.simpleicons.org/googlegemini/4796E3",
    apiKeyUrl: "https://aistudio.google.com/apikey",
    apiKeyUrlLabel: "aistudio.google.com",
    fields: [
      { key: "gemini_api_key", label: "API Key", placeholder: "AIza...", description: "Chave padrão para Gemini." },
      { key: "gemini_default_model", label: "Modelo padrão", description: "Versão do Gemini usada por padrão.", type: "model", options: MODELS_GEMINI },
    ],
  },
  {
    id: "elevenlabs",
    label: "ElevenLabs",
    category: "voz",
    description: "Síntese de voz (TTS) ultra-realista para agentes e Stark.",
    logo: "https://cdn.simpleicons.org/elevenlabs/_/000000",
    apiKeyUrl: "https://elevenlabs.io/app/settings/api-keys",
    apiKeyUrlLabel: "elevenlabs.io",
    fields: [
      { key: "elevenlabs_api_key", label: "API Key", placeholder: "xi-...", description: "Voz padrão da plataforma (agência sem chave própria cai aqui)." },
    ],
  },
  {
    id: "telnyx",
    label: "Telnyx",
    category: "telefonia",
    description: "Números telefônicos reais (BR + global), webhooks de chamadas inbound/outbound.",
    logo: telnyxLogo.url,
    apiKeyUrl: "https://portal.telnyx.com/#/app/api-keys",
    apiKeyUrlLabel: "portal.telnyx.com",
    fields: [
      { key: "telnyx_api_key", label: "API Key", placeholder: "KEY...", description: "Token de API do Telnyx." },
      { key: "telnyx_connection_id", label: "Connection ID", placeholder: "1234567890", description: "ID da conexão SIP no painel Telnyx." },
    ],
  },
  {
    id: "livekit",
    label: "LiveKit",
    category: "telefonia",
    description: "Servidor WebRTC pra chamadas no navegador (browser-call).",
    logo: "https://cdn.simpleicons.org/livekit/_/000000",
    apiKeyUrl: "https://cloud.livekit.io",
    apiKeyUrlLabel: "cloud.livekit.io",
    fields: [
      { key: "livekit_url", label: "URL", placeholder: "wss://your-project.livekit.cloud", description: "Endpoint do servidor LiveKit." },
      { key: "livekit_api_key", label: "API Key", placeholder: "API...", description: "Chave de API." },
      { key: "livekit_api_secret", label: "API Secret", placeholder: "secret...", description: "Segredo pra assinatura JWT." },
    ],
  },
  {
    id: "meta_login",
    label: "Meta — Login Oficial (1-clique)",
    category: "comunicacao",
    description: "Configurações do Embedded Signup: com elas preenchidas, as agências conectam WhatsApp e Instagram só clicando em 'Conectar' e logando na Meta — sem colar token. O META_APP_SECRET fica nos secrets do Supabase (nunca aqui).",
    logo: "https://cdn.simpleicons.org/meta/0081FB",
    apiKeyUrl: "https://developers.facebook.com/apps",
    apiKeyUrlLabel: "developers.facebook.com → Facebook Login for Business → Configurações",
    fields: [
      { key: "meta_app_id", label: "App ID (Facebook)", placeholder: "2356582444746370", description: "ID do app Aikortex na Meta — usado por WhatsApp e Facebook (público)." },
      { key: "meta_whatsapp_config_id", label: "Config ID — WhatsApp", placeholder: "ex: 123456...", description: "Configuração de Embedded Signup do WhatsApp (Login for Business)." },
      { key: "meta_instagram_app_id", label: "Instagram App ID", placeholder: "ex: 1389188739737107", description: "ID do app do INSTAGRAM (produto Instagram → API setup with Instagram login). NÃO é o Facebook App ID." },
      { key: "meta_facebook_config_id", label: "Config ID — Facebook Messenger", placeholder: "ex: 123456...", description: "Configuração de Login for Business com pages_messaging + pages_manage_metadata." },
    ],
  },
  {
    id: "asaas",
    label: "Asaas (Master)",
    category: "pagamentos",
    description: "Conta master da Aikortex — cobrança recorrente dos clientes finais com split nativo pras agências.",
    logo: asaasLogoLight.url,
    apiKeyUrl: "https://www.asaas.com/integracao-api",
    apiKeyUrlLabel: "asaas.com",
    fields: [
      { key: "asaas_master_api_key", label: "API Key (Master)", placeholder: "$aact_...", description: "Chave da conta Aikortex. Sandbox começa com $aact_YTUz..." },
      { key: "asaas_webhook_token", label: "Webhook Token", placeholder: "wb_aikortex_... (mín. 32 chars)", description: "Mesmo token configurado em Asaas → Webhooks." },
      { key: "asaas_api_base", label: "API Base", placeholder: "https://sandbox.asaas.com/api/v3", description: "Sandbox pra testes, https://api.asaas.com/v3 em produção." },
    ],
  },
];

const CATEGORY_META: Record<ProviderGroup["category"], { label: string; color: string }> = {
  llm: { label: "IA / LLM", color: "border-violet-500/30 text-violet-400" },
  voz: { label: "Voz", color: "border-purple-500/30 text-purple-400" },
  telefonia: { label: "Telefonia", color: "border-blue-500/30 text-blue-400" },
  comunicacao: { label: "Comunicação", color: "border-emerald-500/30 text-emerald-400" },
  pagamentos: { label: "Pagamentos", color: "border-amber-500/30 text-amber-400" },
  infra: { label: "Infra", color: "border-slate-500/30 text-slate-400" },
};

const AdminConfigTab = () => {
  const { user } = useAuth();
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openProvider, setOpenProvider] = useState<ProviderGroup | null>(null);
  // Modelos vindos de available_llms (gerenciados em /admin?tab=llms).
  // Quando admin ativa/desativa um modelo la, automaticamente reflete aqui.
  const [llmsByProvider, setLlmsByProvider] = useState<Record<string, { id: string; label: string }[]>>({});
  const [refreshing, setRefreshing] = useState<string | null>(null);

  useEffect(() => { loadConfig(); loadActiveLLMs(); }, []);

  const loadActiveLLMs = async () => {
    const { data, error } = await supabase
      .from("available_llms")
      .select("provider, model_id, display_name, tier, active")
      .eq("active", true)
      .order("provider", { ascending: true })
      .order("priority", { ascending: true });
    if (error || !data) return;

    const grouped: Record<string, { id: string; label: string }[]> = {};
    for (const row of data as any[]) {
      const provider = String(row.provider || "").toLowerCase();
      if (!grouped[provider]) grouped[provider] = [];
      const tierBadge = row.tier ? ` (${row.tier})` : "";
      const label = row.display_name ? `${row.display_name}${tierBadge}` : row.model_id;
      grouped[provider].push({ id: row.model_id, label });
    }
    setLlmsByProvider(grouped);
  };

  const loadConfig = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("platform_config" as any)
      .select("key, value");

    if (!error && data) {
      const values: Record<string, string> = {};
      const keys = new Set<string>();
      for (const row of data as any[]) {
        values[row.key] = row.value;
        if (row.value) keys.add(row.key);
      }
      setConfigValues(values);
      setSavedKeys(keys);
    }
    setLoading(false);
  };

  const handleChange = (key: string, value: string) => {
    setConfigValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleVisibility = (key: string) => {
    setVisibleFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const saveField = async (field: ConfigField) => {
    const value = configValues[field.key];
    if (!value) { toast.error("Insira um valor antes de salvar"); return; }
    setSavingKey(field.key);
    try {
      const { error } = await (supabase.from("platform_config" as any) as any).upsert(
        {
          key: field.key,
          value,
          description: field.description,
          is_secret: true,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        },
        { onConflict: "key" }
      );
      if (error) { toast.error(`Erro ao salvar ${field.label}`); return; }
      setSavedKeys((prev) => new Set(prev).add(field.key));
      toast.success(`${field.label} salva`);
    } finally {
      setSavingKey(null);
    }
  };

  const providerStatus = (p: ProviderGroup): "configured" | "partial" | "empty" => {
    const setCount = p.fields.filter((f) => savedKeys.has(f.key)).length;
    if (setCount === 0) return "empty";
    if (setCount === p.fields.length) return "configured";
    return "partial";
  };

  /** Provider esta ativo? Default true (chave configurada serve por padrao).
   *  Quando admin clica 'desativar', salva '{providerId}_active' = 'false'. */
  const isProviderActive = (p: ProviderGroup): boolean => {
    const flag = configValues[`${p.id}_active`];
    if (flag === "false") return false;
    return true; // default = active
  };

  /** Busca catalogo de modelos mais recente do provedor na API publica/auth. */
  const refreshLlmCatalog = async (providerId: string) => {
    setRefreshing(providerId);
    try {
      const { data, error } = await supabase.functions.invoke("refresh-llm-catalog", {
        body: { provider: providerId },
      });
      if (error || (data as any)?.error) {
        const msg = (data as any)?.message || (error as Error)?.message || "Falha ao buscar modelos";
        toast.error(msg);
        return;
      }
      const stats = (data as any)?.by_provider?.[providerId];
      if (stats?.error) {
        toast.error(`Erro: ${stats.error}`);
        return;
      }
      const newCount = stats?.new ?? 0;
      const updated = stats?.updated ?? 0;
      const total = stats?.count ?? 0;
      if (newCount > 0) {
        toast.success(
          `${newCount} modelo${newCount === 1 ? "" : "s"} novo${newCount === 1 ? "" : "s"} encontrado${newCount === 1 ? "" : "s"}! Ative em /admin?tab=llms.`,
          { duration: 8000 },
        );
      } else if (updated > 0) {
        toast.success(`${updated} modelo${updated === 1 ? "" : "s"} atualizado${updated === 1 ? "" : "s"} (${total} total)`);
      } else {
        toast.info(`Nenhum modelo novo (${total} total)`);
      }
      await loadActiveLLMs(); // re-busca pra atualizar dropdown imediato
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    } finally {
      setRefreshing(null);
    }
  };

  const toggleProviderActive = async (p: ProviderGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentlyActive = isProviderActive(p);
    const newValue = currentlyActive ? "false" : "true";
    const key = `${p.id}_active`;

    // Optimistic update
    setConfigValues((prev) => ({ ...prev, [key]: newValue }));

    try {
      const { error } = await (supabase.from("platform_config" as any) as any).upsert(
        {
          key,
          value: newValue,
          description: `Flag ativa/inativa pro provedor ${p.label}`,
          is_secret: false,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        },
        { onConflict: "key" },
      );
      if (error) {
        // Reverte optimistic
        setConfigValues((prev) => ({ ...prev, [key]: currentlyActive ? "true" : "false" }));
        toast.error(`Falha ao ${currentlyActive ? "desativar" : "ativar"} ${p.label}`);
        return;
      }
      if (newValue === "true") {
        setSavedKeys((prev) => new Set(prev).add(key));
      }
      toast.success(`${p.label} ${currentlyActive ? "desativado" : "ativado"}`);
    } catch {
      setConfigValues((prev) => ({ ...prev, [key]: currentlyActive ? "true" : "false" }));
      toast.error("Erro inesperado");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Chaves de API da Plataforma</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure as integrações centralizadas usadas automaticamente pelos usuários da plataforma. Clique num card pra editar.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PROVIDERS.map((p) => {
          const status = providerStatus(p);
          const catMeta = CATEGORY_META[p.category];
          const active = isProviderActive(p);
          return (
            <div
              key={p.id}
              className={cn(
                "relative rounded-lg border bg-card transition-all p-4 cursor-pointer",
                "hover:border-primary/40 hover:shadow-md",
                !active && "opacity-60 grayscale",
                active && status === "configured" && "border-emerald-500/30 bg-emerald-500/[0.02]",
                active && status === "partial" && "border-amber-500/30 bg-amber-500/[0.02]",
                (active && status === "empty") && "border-border",
                !active && "border-border",
              )}
              onClick={() => setOpenProvider(p)}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  {p.logo && (
                    <div className="w-16 h-16 grid place-items-center shrink-0">
                      {p.id === "asaas" ? (
                        <>
                          <img src={asaasLogoLight.url} alt={p.label} className="w-14 h-14 object-contain block dark:hidden" />
                          <img src={asaasLogoDark.url} alt={p.label} className="w-14 h-14 object-contain hidden dark:block" />
                        </>
                      ) : p.id === "telnyx" ? (
                        <img src={telnyxLogo.url} alt={p.label} className="w-14 h-14 object-contain" />
                      ) : (
                        <img
                          src={p.logo}
                          alt={p.label}
                          className={`w-8 h-8 object-contain ${
                            ["openai", "elevenlabs", "livekit"].includes(p.id) ? "dark:invert" : ""
                          }`}
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                        />
                      )}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p.label}</p>
                    <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5 mt-0.5", catMeta.color)}>
                      {catMeta.label}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {active && status === "configured" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {active && status === "partial" && <AlertCircle className="w-4 h-4 text-amber-500" />}
                  <Switch
                    checked={active}
                    onClick={(e) => toggleProviderActive(p, e as unknown as React.MouseEvent)}
                    title={active ? "Desativar provedor" : "Ativar provedor"}
                  />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{p.description}</p>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>
                  {p.fields.filter((f) => savedKeys.has(f.key)).length}/{p.fields.length} campo{p.fields.length === 1 ? "" : "s"} configurado{p.fields.length === 1 ? "" : "s"}
                </span>
                {!active && (
                  <span className="inline-flex items-center gap-1 text-amber-500/80 font-medium">
                    <Power className="w-2.5 h-2.5" /> Inativo
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog de edição */}
      <Dialog open={!!openProvider} onOpenChange={(o) => !o && setOpenProvider(null)}>
        <DialogContent className="max-w-lg">
          {openProvider && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <DialogTitle className="flex items-center gap-3">
                    {openProvider.logo && (
                      <div className="w-14 h-14 grid place-items-center">
                        {openProvider.id === "asaas" ? (
                          <>
                            <img src={asaasLogoLight.url} alt={openProvider.label} className="w-12 h-12 object-contain block dark:hidden" />
                            <img src={asaasLogoDark.url} alt={openProvider.label} className="w-12 h-12 object-contain hidden dark:block" />
                          </>
                        ) : openProvider.id === "telnyx" ? (
                          <img src={telnyxLogo.url} alt={openProvider.label} className="w-12 h-12 object-contain" />
                        ) : (
                          <img
                            src={openProvider.logo}
                            alt={openProvider.label}
                            className={`w-7 h-7 object-contain ${
                              ["openai", "elevenlabs", "livekit"].includes(openProvider.id) ? "dark:invert" : ""
                            }`}
                          />
                        )}
                      </div>
                    )}
                    {openProvider.label}
                  </DialogTitle>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {isProviderActive(openProvider) ? "Ativo" : "Inativo"}
                    </span>
                    <Switch
                      checked={isProviderActive(openProvider)}
                      onClick={(e) => toggleProviderActive(openProvider, e as unknown as React.MouseEvent)}
                    />
                  </div>
                </div>
                <DialogDescription className="text-xs">
                  {openProvider.description}
                  {openProvider.apiKeyUrl && (
                    <>
                      {" "}
                      <a
                        href={openProvider.apiKeyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary inline-flex items-center gap-0.5 hover:underline"
                      >
                        Pegar chave em {openProvider.apiKeyUrlLabel} <ExternalLink className="w-3 h-3" />
                      </a>
                    </>
                  )}
                </DialogDescription>

                {/* Botao buscar ultimos modelos — so pra LLM providers */}
                {openProvider.category === "llm" && (
                  <div className="pt-2">
                    <Button
                      onClick={() => refreshLlmCatalog(openProvider.id)}
                      disabled={refreshing === openProvider.id}
                      size="sm"
                      variant="outline"
                      className="gap-1.5 w-full"
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5", refreshing === openProvider.id && "animate-spin")} />
                      {refreshing === openProvider.id ? "Buscando..." : `Buscar últimos modelos do ${openProvider.label}`}
                    </Button>
                    <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                      Consulta API do provedor pra cadastrar modelos novos. Novos entram como inativos em <a href="/admin?tab=llms" className="text-primary hover:underline">Modelos LLM</a> pra você revisar.
                    </p>
                  </div>
                )}
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {openProvider.fields.map((field) => {
                  const isConfigured = savedKeys.has(field.key) && !!configValues[field.key];
                  const isVisible = visibleFields.has(field.key);
                  const currentValue = configValues[field.key] || "";

                  // ── Type: model (dropdown com opcoes + "Outro") ──
                  if (field.type === "model") {
                    // OpenRouter eh gateway universal — roteia pra QUALQUER
                    // modelo do available_llms. Demais providers (Anthropic,
                    // OpenAI, Gemini direto) so mostram seus proprios models.
                    const dynamicModels: { id: string; label: string }[] = openProvider.id === "openrouter"
                      ? Object.values(llmsByProvider).flat()
                      : (llmsByProvider[openProvider.id] || []);
                    // Dedup por id (evita duplicado caso 2 providers tenham mesmo id)
                    const seen = new Set<string>();
                    const dedupedDynamic = dynamicModels.filter((m) => {
                      if (seen.has(m.id)) return false;
                      seen.add(m.id);
                      return true;
                    });
                    const options = dedupedDynamic.length > 0 ? dedupedDynamic : (field.options || []);
                    const knownIds = options.map((o) => o.id);
                    const isCustom = !!currentValue && !knownIds.includes(currentValue);
                    const selectValue = isCustom ? CUSTOM_MODEL_OPTION : (currentValue || "");

                    return (
                      <div key={field.key} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium flex items-center gap-1.5">
                            <Cpu className="w-3 h-3 text-muted-foreground" />
                            {field.label}
                          </Label>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] h-4 px-1.5",
                              isConfigured ? "border-emerald-500/40 text-emerald-500" : "border-muted-foreground/30 text-muted-foreground",
                            )}
                          >
                            {isConfigured ? currentValue : "Padrão automático"}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{field.description}</p>
                        <div className="flex gap-2">
                          <div className="flex-1 space-y-1.5">
                            <Select
                              value={selectValue}
                              onValueChange={(v) => {
                                if (v === CUSTOM_MODEL_OPTION) {
                                  handleChange(field.key, currentValue || "");
                                } else {
                                  handleChange(field.key, v);
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder={options.length === 0 ? "Nenhum modelo ativo — adicione em /admin?tab=llms" : "Escolha um modelo"} />
                              </SelectTrigger>
                              <SelectContent>
                                {options.map((opt) => (
                                  <SelectItem key={opt.id} value={opt.id}>
                                    <div className="flex flex-col">
                                      <span className="text-xs">{opt.label}</span>
                                      <span className="text-[9px] text-muted-foreground font-mono">{opt.id}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                                <SelectItem value={CUSTOM_MODEL_OPTION}>
                                  <span className="text-xs italic">Outro (digitar manualmente)</span>
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            {dedupedDynamic.length > 0 && (
                              <p className="text-[9px] text-muted-foreground">
                                {dedupedDynamic.length} modelo{dedupedDynamic.length === 1 ? "" : "s"} ativo{dedupedDynamic.length === 1 ? "" : "s"} — gerencie em <a href="/admin?tab=llms" className="text-primary hover:underline">Modelos LLM</a>
                              </p>
                            )}

                            {isCustom && (
                              <Input
                                value={currentValue}
                                onChange={(e) => handleChange(field.key, e.target.value)}
                                placeholder="ex.: claude-haiku-5-0-20260201"
                                className="font-mono text-xs h-8"
                              />
                            )}
                          </div>
                          <Button
                            onClick={() => saveField(field)}
                            disabled={savingKey === field.key}
                            size="sm"
                            className="gap-1.5 shrink-0 h-8 self-start"
                          >
                            <Save className="w-3 h-3" />
                            {savingKey === field.key ? "..." : "Salvar"}
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  // ── Type: secret (default) — input password com eye ──
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">{field.label}</Label>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] h-4 px-1.5",
                            isConfigured ? "border-emerald-500/40 text-emerald-500" : "border-muted-foreground/30 text-muted-foreground",
                          )}
                        >
                          {isConfigured ? "Configurado" : "Vazio"}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{field.description}</p>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={isVisible ? "text" : "password"}
                            value={currentValue}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            placeholder={field.placeholder || `Insira ${field.label}`}
                            className="pr-9 font-mono text-xs h-8"
                          />
                          <button
                            type="button"
                            onClick={() => toggleVisibility(field.key)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <Button
                          onClick={() => saveField(field)}
                          disabled={savingKey === field.key}
                          size="sm"
                          className="gap-1.5 shrink-0 h-8"
                        >
                          <Save className="w-3 h-3" />
                          {savingKey === field.key ? "..." : "Salvar"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminConfigTab;
