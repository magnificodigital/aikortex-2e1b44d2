import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Eye, EyeOff, Save, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ConfigField {
  key: string;
  label: string;
  placeholder?: string;
  description: string;
}

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
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    category: "llm",
    description: "GPT-4o, GPT-4.1, o3 e Whisper (transcrição de voz).",
    logo: new URL("@/assets/openai-icon.png", import.meta.url).href,
    apiKeyUrl: "https://platform.openai.com/api-keys",
    apiKeyUrlLabel: "platform.openai.com",
    fields: [
      { key: "openai_api_key", label: "API Key", placeholder: "sk-...", description: "Chave padrão para GPT e Whisper." },
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
    ],
  },
  {
    id: "elevenlabs",
    label: "ElevenLabs",
    category: "voz",
    description: "Síntese de voz (TTS) ultra-realista para agentes e Spark.",
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
    logo: "https://cdn.simpleicons.org/telnyx/_/00E3AA",
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
    logo: "https://cdn.simpleicons.org/livekit/_/FFFFFF",
    apiKeyUrl: "https://cloud.livekit.io",
    apiKeyUrlLabel: "cloud.livekit.io",
    fields: [
      { key: "livekit_url", label: "URL", placeholder: "wss://your-project.livekit.cloud", description: "Endpoint do servidor LiveKit." },
      { key: "livekit_api_key", label: "API Key", placeholder: "API...", description: "Chave de API." },
      { key: "livekit_api_secret", label: "API Secret", placeholder: "secret...", description: "Segredo pra assinatura JWT." },
    ],
  },
  {
    id: "whatsapp",
    label: "WhatsApp Cloud API",
    category: "comunicacao",
    description: "Mensagens via WhatsApp Business da Meta (templates aprovados + chat ativo).",
    logo: "https://cdn.simpleicons.org/whatsapp/25D366",
    apiKeyUrl: "https://developers.facebook.com/apps",
    apiKeyUrlLabel: "developers.facebook.com",
    fields: [
      { key: "whatsapp_token", label: "Access Token", placeholder: "EAAx...", description: "Token de acesso da Meta." },
      { key: "whatsapp_phone_number_id", label: "Phone Number ID", placeholder: "123456789012345", description: "ID do número configurado." },
    ],
  },
  {
    id: "asaas",
    label: "Asaas (Master)",
    category: "pagamentos",
    description: "Conta master da Aikortex — cobrança recorrente dos clientes finais com split nativo pras agências.",
    logo: "https://cdn.simpleicons.org/asaas/_/00B96B",
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

  useEffect(() => { loadConfig(); }, []);

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
          return (
            <button
              key={p.id}
              onClick={() => setOpenProvider(p)}
              className={cn(
                "text-left rounded-lg border bg-card hover:bg-accent/30 transition-all p-4 group",
                "hover:border-primary/40 hover:shadow-md",
                status === "configured" && "border-emerald-500/30 bg-emerald-500/[0.02]",
                status === "partial" && "border-amber-500/30 bg-amber-500/[0.02]",
                status === "empty" && "border-border",
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  {p.logo && (
                    <div className="w-10 h-10 rounded-lg bg-muted/50 grid place-items-center shrink-0">
                      <img
                        src={p.logo}
                        alt={p.label}
                        className="w-7 h-7 object-contain"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p.label}</p>
                    <Badge variant="outline" className={cn("text-[9px] h-4 px-1.5 mt-0.5", catMeta.color)}>
                      {catMeta.label}
                    </Badge>
                  </div>
                </div>
                {status === "configured" && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                {status === "partial" && <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />}
              </div>

              <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">{p.description}</p>

              <div className="text-[10px] text-muted-foreground">
                {p.fields.filter((f) => savedKeys.has(f.key)).length}/{p.fields.length} campo{p.fields.length === 1 ? "" : "s"} configurado{p.fields.length === 1 ? "" : "s"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Dialog de edição */}
      <Dialog open={!!openProvider} onOpenChange={(o) => !o && setOpenProvider(null)}>
        <DialogContent className="max-w-lg">
          {openProvider && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {openProvider.logo && (
                    <div className="w-9 h-9 rounded-lg bg-muted/50 grid place-items-center">
                      <img src={openProvider.logo} alt={openProvider.label} className="w-6 h-6 object-contain" />
                    </div>
                  )}
                  {openProvider.label}
                </DialogTitle>
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
              </DialogHeader>

              <div className="space-y-4 mt-2">
                {openProvider.fields.map((field) => {
                  const isConfigured = savedKeys.has(field.key) && !!configValues[field.key];
                  const isVisible = visibleFields.has(field.key);
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">{field.label}</Label>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] h-4 px-1.5",
                            isConfigured
                              ? "border-emerald-500/40 text-emerald-500"
                              : "border-muted-foreground/30 text-muted-foreground",
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
                            value={configValues[field.key] || ""}
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
