import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Check, Eye, EyeOff, ExternalLink, KeyRound, Settings, Trash2, Sparkles, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fnUrl } from "@/lib/supabase-url";

// Providers que usam OAuth gerenciado via Composio (não API key local).
// Clicar abre popup do Composio que redireciona pro provider — Composio faz
// todo o OAuth, retorna ACTIVE quando user autoriza. Polling em composio-status
// detecta a conexão.
const OAUTH_PROVIDERS = new Set([
  "google_calendar", "google_sheets", "google_drive", "gmail",
  "hubspot", "calendly", "notion", "slack",
  "airtable", "asana", "trello", "discord", "dropbox",
  "github", "linkedin", "zoom", "clickup",
]);
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import aikortexIconDark from "@/assets/aikortex-icon-dark.png";
import aikortexIconLight from "@/assets/aikortex-icon-light.png";
import { HubSpotSyncSettings } from "@/components/settings/HubSpotSyncSettings";
import outlookCalendarIcon from "@/assets/outlook-calendar-icon.png";
// Logos multi-color das marcas (baixados do iconify logos collection).
// Mantém identidade visual real em vez de silhueta monocromática.
import gmailLogo from "@/assets/connectors/gmail.svg";
import googleCalendarLogo from "@/assets/connectors/google-calendar.svg";
import googleDriveLogo from "@/assets/connectors/google-drive.svg";
import hubspotLogoLight from "@/assets/connectors/hubspot-light.png.asset.json";
import hubspotLogoDark from "@/assets/connectors/hubspot-dark.png.asset.json";
import notionLogo from "@/assets/connectors/notion.svg";
import slackLogo from "@/assets/connectors/slack.svg";
import airtableLogo from "@/assets/connectors/airtable.svg";
import asanaLogo from "@/assets/connectors/asana.svg";
import trelloLogo from "@/assets/connectors/trello.svg";
import discordLogo from "@/assets/connectors/discord.svg";
import dropboxLogo from "@/assets/connectors/dropbox.svg";
import githubLogo from "@/assets/connectors/github.svg";
import linkedinLogo from "@/assets/connectors/linkedin.svg";
import zoomLogo from "@/assets/connectors/zoom.svg";
import telnyxLogo from "@/assets/connectors/telnyx-logo.png.asset.json";


// Tags semânticas pra categorizar integrações no marketplace. Permite filtros
// rápidos sem migration de banco — vive no objeto de constante.
export type IntegrationTag =
  | "llm"
  | "voz"
  | "telefonia"
  | "calendario"
  | "produtividade"
  | "comunicacao"
  | "crm"
  | "vendas"
  | "dev"
  | "arquivos"
  | "reunioes"
  | "marketing"
  // Tags por nicho — integrações específicas de setor
  | "imobiliaria"
  | "saude"
  | "odontologia"
  | "advocacia"
  | "contabilidade"
  | "estetica"
  | "ecommerce"
  | "food"
  | "pet"
  | "educacao"
  | "seguros";

export const TAG_LABELS: Record<IntegrationTag, string> = {
  llm: "IA / LLM",
  voz: "Voz",
  telefonia: "Telefonia",
  calendario: "Calendário",
  produtividade: "Produtividade",
  comunicacao: "Comunicação",
  crm: "CRM",
  vendas: "Vendas",
  dev: "Dev / Code",
  arquivos: "Arquivos",
  reunioes: "Reuniões",
  marketing: "Marketing",
  imobiliaria: "Imobiliária",
  saude: "Saúde",
  odontologia: "Odontologia",
  advocacia: "Advocacia",
  contabilidade: "Contabilidade",
  estetica: "Estética",
  ecommerce: "E-commerce",
  food: "Food",
  pet: "Pet",
  educacao: "Educação",
  seguros: "Seguros",
};

export interface IntegrationProvider {
  label: string;
  provider: string;
  description: string;
  logo: string;
  native?: boolean;
  apiKeyUrl?: string;
  apiKeyUrlLabel?: string;
  tags?: IntegrationTag[];
  /** Integração ainda não implementada — mostra com badge "Em breve" e
   *  desabilita interação. LLM continua sabendo dela via niche-integrations. */
  comingSoon?: boolean;
}

export const LLM_PROVIDERS: IntegrationProvider[] = [
  {
    label: "Aikortex",
    provider: "aikortex",
    description: "IA nativa da plataforma para criação e estruturação de agentes e apps",
    logo: "",
    native: true,
    tags: ["llm"],
  },
  {
    label: "OpenAI",
    provider: "openai",
    description: "GPT-4o, GPT-4.5, o3 e modelos de linguagem avançados",
    logo: new URL("@/assets/openai-icon.png", import.meta.url).href,
    apiKeyUrl: "https://platform.openai.com/api-keys",
    apiKeyUrlLabel: "platform.openai.com",
    tags: ["llm"],
  },
  {
    label: "Anthropic",
    provider: "anthropic",
    description: "Claude Opus 4, Sonnet 4.5, Haiku e modelos seguros de IA",
    logo: "https://cdn.simpleicons.org/anthropic/_/D97757",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    apiKeyUrlLabel: "console.anthropic.com",
    tags: ["llm"],
  },
  {
    label: "Google Gemini",
    provider: "gemini",
    description: "Gemini 2.5 Pro, Flash e IA multimodal do Google",
    logo: "https://cdn.simpleicons.org/googlegemini/4796E3",
    apiKeyUrl: "https://aistudio.google.com/apikey",
    apiKeyUrlLabel: "aistudio.google.com",
    tags: ["llm"],
  },
  {
    label: "DeepSeek",
    provider: "deepseek",
    description: "DeepSeek R1, V3 e modelos open-source de alto desempenho",
    logo: "https://cdn.simpleicons.org/deepseek/4D6BFE",
    apiKeyUrl: "https://platform.deepseek.com/api_keys",
    apiKeyUrlLabel: "platform.deepseek.com",
    tags: ["llm"],
  },
  {
    label: "ElevenLabs",
    provider: "elevenlabs",
    description: "Síntese de voz (TTS) ultra-realista, clonagem de voz e Conversational AI",
    logo: "https://cdn.simpleicons.org/elevenlabs/_/000000",
    apiKeyUrl: "https://elevenlabs.io/app/settings/api-keys",
    apiKeyUrlLabel: "elevenlabs.io",
    tags: ["voz"],
  },
];

// Logos das marcas em cores originais (multi-color SVG quando disponível,
// silhueta na cor da marca via simpleicons como fallback pros poucos que
// não estão no iconify logos collection).
export const SERVICE_PROVIDERS: IntegrationProvider[] = [
  {
    label: "Telnyx",
    provider: "telnyx",
    description: "Telefonia em nuvem (números reais, inbound + outbound) para chamadas de voz dos agentes.",
    logo: telnyxLogo.url,
    apiKeyUrl: "https://portal.telnyx.com/#/app/api-keys",
    apiKeyUrlLabel: "portal.telnyx.com",
    tags: ["telefonia"],
  },
  { label: "Gmail", provider: "gmail", description: "Ler, enviar e compor e-mails.", logo: gmailLogo, tags: ["comunicacao", "produtividade"] },
  { label: "Google Calendar", provider: "google_calendar", description: "Ler e gerenciar eventos.", logo: googleCalendarLogo, tags: ["calendario", "produtividade"] },
  { label: "Google Sheets", provider: "google_sheets", description: "Ler e escrever planilhas.", logo: "https://cdn.simpleicons.org/googlesheets/34A853", tags: ["produtividade", "arquivos"] },
  { label: "Google Drive", provider: "google_drive", description: "Ler, enviar e gerenciar arquivos.", logo: googleDriveLogo, tags: ["arquivos", "produtividade"] },
  { label: "Outlook Calendar", provider: "outlook_calendar", description: "Gerenciar calendário Microsoft.", logo: outlookCalendarIcon, tags: ["calendario", "produtividade"] },
  { label: "Calendly", provider: "calendly", description: "Agendamento automático de reuniões.", logo: "https://cdn.simpleicons.org/calendly/006BFF", tags: ["calendario", "reunioes"] },
  { label: "HubSpot", provider: "hubspot", description: "CRM, contatos, deals e pipelines.", logo: hubspotLogoLight.url, tags: ["crm", "vendas", "marketing"] },
  { label: "Notion", provider: "notion", description: "Páginas, databases e blocos.", logo: notionLogo, tags: ["produtividade", "arquivos"] },
  { label: "Slack", provider: "slack", description: "Mensagens e canais de equipe.", logo: slackLogo, tags: ["comunicacao"] },
  { label: "Airtable", provider: "airtable", description: "Bases, tabelas e registros.", logo: airtableLogo, tags: ["produtividade", "arquivos"] },
  { label: "Asana", provider: "asana", description: "Tarefas e projetos.", logo: asanaLogo, tags: ["produtividade"] },
  { label: "Trello", provider: "trello", description: "Boards e cards.", logo: trelloLogo, tags: ["produtividade"] },
  { label: "ClickUp", provider: "clickup", description: "Gestão de tarefas e docs.", logo: "https://cdn.simpleicons.org/clickup/7B68EE", tags: ["produtividade"] },
  { label: "Discord", provider: "discord", description: "Mensagens em servidores e canais.", logo: discordLogo, tags: ["comunicacao"] },
  { label: "Dropbox", provider: "dropbox", description: "Arquivos e pastas na nuvem.", logo: dropboxLogo, tags: ["arquivos"] },
  { label: "GitHub", provider: "github", description: "Repos, issues e PRs.", logo: githubLogo, tags: ["dev"] },
  { label: "LinkedIn", provider: "linkedin", description: "Posts e mensagens profissionais.", logo: linkedinLogo, tags: ["comunicacao", "marketing"] },
  { label: "Zoom", provider: "zoom", description: "Reuniões e gravações.", logo: zoomLogo, tags: ["reunioes", "comunicacao"] },

  // ── CRMs genéricos BR (top 2 que faltavam) ──────────────────────────────
  { label: "RD Station CRM", provider: "rd_station_crm", description: "CRM líder no SMB brasileiro.", logo: "https://cdn.simpleicons.org/rdstation/24D366", tags: ["crm", "vendas", "marketing"], comingSoon: true },
  { label: "Pipedrive", provider: "pipedrive", description: "CRM focado em vendas B2B.", logo: "https://cdn.simpleicons.org/pipedrive/000000", tags: ["crm", "vendas"], comingSoon: true },

  // ── Imobiliária ─────────────────────────────────────────────────────────
  { label: "Vista CRM", provider: "vista_crm", description: "CRM imobiliário mais usado no Brasil.", logo: "https://cdn.simpleicons.org/buildkite/14CC80", tags: ["imobiliaria", "crm"], comingSoon: true },
  { label: "Zap Imóveis", provider: "zap_imoveis", description: "Marketplace de imóveis #1 do Brasil.", logo: "https://cdn.simpleicons.org/zerodha/387ED1", tags: ["imobiliaria", "marketing"], comingSoon: true },

  // ── Saúde / Odontologia ─────────────────────────────────────────────────
  { label: "iClinic", provider: "iclinic", description: "Prontuário eletrônico e agendamento líder BR.", logo: "https://cdn.simpleicons.org/oraclecloud/FF0000", tags: ["saude"], comingSoon: true },
  { label: "Doctoralia", provider: "doctoralia", description: "Marketplace e agendamento de consultas.", logo: "https://cdn.simpleicons.org/teladoc/00A4D9", tags: ["saude"], comingSoon: true },
  { label: "ClinicDent", provider: "clinicdent", description: "Gestão de clínica odontológica.", logo: "https://cdn.simpleicons.org/dental/00A4D9", tags: ["odontologia"], comingSoon: true },

  // ── Advocacia ───────────────────────────────────────────────────────────
  { label: "Astrea", provider: "astrea", description: "Software jurídico líder em escritórios SMB.", logo: "https://cdn.simpleicons.org/ankermake/8B5CF6", tags: ["advocacia"], comingSoon: true },
  { label: "Projuris", provider: "projuris", description: "Plataforma jurídica enterprise.", logo: "https://cdn.simpleicons.org/protocols/0066CC", tags: ["advocacia"], comingSoon: true },

  // ── Contabilidade ───────────────────────────────────────────────────────
  { label: "Conta Azul", provider: "conta_azul", description: "Gestão financeira pra pequenas empresas.", logo: "https://cdn.simpleicons.org/contactlesspayment/0066FF", tags: ["contabilidade"], comingSoon: true },
  { label: "Domínio Sistemas", provider: "dominio_sistemas", description: "Sistema contábil/fiscal mais usado no Brasil.", logo: "https://cdn.simpleicons.org/dominos/006491", tags: ["contabilidade"], comingSoon: true },

  // ── Estética ────────────────────────────────────────────────────────────
  { label: "Belezix", provider: "belezix", description: "Agendamento líder pra estética e salão.", logo: "https://cdn.simpleicons.org/buffer/168EEA", tags: ["estetica"], comingSoon: true },

  // ── E-commerce ──────────────────────────────────────────────────────────
  { label: "Shopify", provider: "shopify", description: "Plataforma de e-commerce global.", logo: "https://cdn.simpleicons.org/shopify/96BF48", tags: ["ecommerce"], comingSoon: true },
  { label: "Nuvemshop", provider: "nuvemshop", description: "E-commerce líder SMB BR.", logo: "https://cdn.simpleicons.org/nuxt/00DC82", tags: ["ecommerce"], comingSoon: true },

  // ── Food / Restaurante ──────────────────────────────────────────────────
  { label: "iFood", provider: "ifood", description: "Marketplace #1 de delivery.", logo: "https://cdn.simpleicons.org/ifood/EA1D2C", tags: ["food"], comingSoon: true },
  { label: "Anota AI", provider: "anota_ai", description: "Pedidos via WhatsApp pra restaurantes.", logo: "https://cdn.simpleicons.org/anonymous/000000", tags: ["food"], comingSoon: true },

  // ── Pet / Veterinária ───────────────────────────────────────────────────
  { label: "SimplesVet", provider: "simplesvet", description: "Gestão de clínica veterinária líder BR.", logo: "https://cdn.simpleicons.org/petsathome/00A859", tags: ["pet"], comingSoon: true },

  // ── Educação ────────────────────────────────────────────────────────────
  { label: "Hotmart", provider: "hotmart", description: "Marketplace de cursos digitais #1 BR.", logo: "https://cdn.simpleicons.org/hotjar/FD3A5C", tags: ["educacao"], comingSoon: true },
  { label: "Sponte", provider: "sponte", description: "Gestão de cursos e escolas BR.", logo: "https://cdn.simpleicons.org/spotify/1ED760", tags: ["educacao"], comingSoon: true },

  // ── Seguros ─────────────────────────────────────────────────────────────
  { label: "Sigecorr", provider: "sigecorr", description: "Sistema de corretora de seguros líder BR.", logo: "https://cdn.simpleicons.org/securityscorecard/1F95DA", tags: ["seguros"], comingSoon: true },
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
  /**
   * Visual variant.
   * "row" (default): one row per provider — logo + name + button na lateral.
   *   Bom pra LLMs onde cada provider tem config rica.
   * "card": grid de cards quadrados — logo grande no topo, nome embaixo, card todo clicável.
   *   Padrão Zaia/Composio pra catálogo de conectores. Card todo dispara openDialog.
   */
  variant?: "row" | "card";
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
  gridClassName,
  variant = "row",
  showTitle = true,
  title = "APIs & Provedores de IA",
  subtitle = "Conecte suas chaves de API para habilitar integrações.",
  onConnectedProvidersChange,
  onProviderConfigsChange,
  initialProviderConfigs,
  storageKey = "aikortex-provider-configs",
}: IntegrationsGridProps) {
  // Grid responsivo padrão por variante. Row = 1-2 colunas (linhas largas).
  // Card = 2-5 colunas (cards quadrados densos no estilo Zaia/Composio).
  const resolvedGridClass = gridClassName ?? (
    variant === "card"
      ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
      : "grid grid-cols-1 md:grid-cols-2 gap-1"
  );
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

  // Tags disponíveis na coleção atual (calculadas dinamicamente — só mostra
  // chip de tag que tem ao menos 1 integração).
  const availableTags = Array.from(
    new Set(displayProviders.flatMap((p) => p.tags ?? []))
  ) as IntegrationTag[];

  const [activeTag, setActiveTag] = useState<IntegrationTag | "all">("all");

  if (activeTag !== "all") {
    displayProviders = displayProviders.filter((p) => (p.tags ?? []).includes(activeTag));
  }

  const connectedCount = displayProviders.filter(p => p.native || connectorKeys[p.provider]?.configured).length;

  const openDialog = (provider: IntegrationProvider) => {
    // Providers Google usam OAuth, não API key.
    // - NÃO conectado: dispara popup OAuth direto (sem dialog)
    // - JÁ conectado: abre dialog enxuto com botão "Desconectar"
    if (OAUTH_PROVIDERS.has(provider.provider)) {
      const isConnectedNow = !!connectorKeys[provider.provider]?.configured;
      if (!isConnectedNow) {
        void startOAuthFlow(provider.provider);
        return;
      }
      // Connected: abre dialog só pra mostrar status + permitir desconectar.
      setKeyInput("");
      setPublicKeyInput("");
      setShowKey(false);
      setDialogProvider(provider);
      return;
    }
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

  // OAuth flow via Composio (managed). Backend chama composio-connect → retorna
  // redirectUrl. Abrimos popup; polling em composio-status detecta ACTIVE.
  const startOAuthFlow = async (providerKey: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        toast.error("Sessão expirada — faça login novamente.");
        return;
      }
      const resp = await fetch(fnUrl("composio-connect"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ provider: providerKey }),
      });
      const json = await resp.json();
      if (!resp.ok || !json.redirectUrl) {
        toast.error(json.message || "Erro ao iniciar conexão");
        return;
      }
      const w = 500, h = 700;
      const left = (screen.width - w) / 2;
      const top = (screen.height - h) / 2;
      const popup = window.open(json.redirectUrl, "composio_oauth", `width=${w},height=${h},left=${left},top=${top}`);
      if (!popup) {
        toast.error("Popup bloqueado — permita popups pra esse site.");
        return;
      }
      toast.info("Autorize a conexão na janela aberta...");

      const finish = (success: boolean, err?: string) => {
        try { popup.close(); } catch { /* ignore */ }
        if (success) {
          toast.success("Conectado com sucesso!");
          void load();
        } else if (err) {
          toast.error(`Erro na conexão: ${err}`);
        }
      };

      // Polling em composio-status — único caminho confiável.
      // Composio não posta mensagem pra nós (popup pousa em página deles).
      const interval = setInterval(async () => {
        try {
          const statusResp = await fetch(fnUrl("composio-status"), {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ provider: providerKey }),
          });
          const statusJson = await statusResp.json();
          if (statusJson?.connected) {
            clearInterval(interval);
            finish(true);
          }
        } catch { /* ignore */ }
      }, 2000);

      // Watcher pra fechar polling se user fechar popup manual
      const popupWatcher = setInterval(() => {
        if (popup.closed) {
          clearInterval(popupWatcher);
          setTimeout(() => clearInterval(interval), 4000);
        }
      }, 500);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao abrir OAuth";
      toast.error(msg);
    }
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
        if (error) { toast.error("Erro ao salvar chave."); return; }
        setConnectorKeys(prev => ({ ...prev, [dialogProvider.provider]: { configured: true } }));
      }
      // Save public key for Telnyx
      if (dialogProvider.provider === "telnyx" && publicKeyInput.trim()) {
        const { error } = await supabase.from("user_api_keys").upsert(
          { user_id: user.id, provider: "telnyx_public", api_key: publicKeyInput.trim() },
          { onConflict: "user_id,provider" }
        );
        if (error) { toast.error("Erro ao salvar chave pública."); return; }
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
      // OAuth providers (Composio): chama composio-disconnect pra remover do
      // Composio também (não só do DB local). Outros: delete direto.
      if (OAUTH_PROVIDERS.has(dialogProvider.provider)) {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          await fetch(fnUrl("composio-disconnect"), {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ provider: dialogProvider.provider }),
          });
        }
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from("user_api_keys").delete().eq("user_id", user.id).eq("provider", dialogProvider.provider);
      }
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
        {availableTags.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveTag("all")}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                activeTag === "all"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
              }`}
            >
              Todas
            </button>
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                  activeTag === tag
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                }`}
              >
                {TAG_LABELS[tag]}
              </button>
            ))}
          </div>
        )}
        {displayProviders.length === 0 && (
          <div className="py-10 text-center text-xs text-muted-foreground">
            Nenhuma integração nessa categoria ainda.{" "}
            <button onClick={() => setActiveTag("all")} className="text-primary hover:underline">
              Ver todas
            </button>
          </div>
        )}
        <div className={resolvedGridClass}>
          {displayProviders.map((p) => {
            const connected = isConnected(p);
            const renderLogo = (size: "sm" | "lg") => {
              const isLargeBrand = p.provider === "telnyx" || p.provider === "hubspot";
              const dim =
                size === "lg" ? (isLargeBrand ? "w-16 h-16" : "w-9 h-9")
                : isLargeBrand ? "w-14 h-14" : "w-7 h-7";
              const cls = `${dim} object-contain`;
              const invertCls = `${dim} rounded object-contain`;
              if (p.provider === "aikortex") {
                return (
                  <>
                    <img src={aikortexIconDark} alt="Aikortex" className={`${cls} block dark:hidden`} />
                    <img src={aikortexIconLight} alt="Aikortex" className={`${cls} hidden dark:block`} />
                  </>
                );
              }
              if (p.provider === "hubspot") {
                return (
                  <>
                    <img src={hubspotLogoLight.url} alt="HubSpot" className={`${cls} block dark:hidden`} />
                    <img src={hubspotLogoDark.url} alt="HubSpot" className={`${cls} hidden dark:block`} />
                  </>
                );
              }
              if (p.provider === "outlook_calendar") {
                // Outlook logo é um PNG colorido local — não precisa de filter.
                return <img src={p.logo} alt={p.label} className={cls} />;
              }
              if (p.logo) {
                // Cores originais da marca. GitHub, Notion, OpenAI e ElevenLabs têm cores
                // únicas (preto/branco) que só funcionam em um theme. Inverter no
                // theme oposto pra ficar visível em ambos.
                const themeAdaptCls =
                  p.provider === "github" ? "dark:invert"
                  : p.provider === "notion" ? "invert dark:invert-0"
                  : p.provider === "openai" ? "dark:invert"
                  : p.provider === "elevenlabs" ? "dark:invert"
                  : "";
                return (
                  <img
                    src={p.logo}
                    alt={p.label}
                    className={`${invertCls} ${themeAdaptCls}`}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                );
              }
              return (
                <div className={`${dim} rounded bg-primary/10 flex items-center justify-center shrink-0`}>
                  <Sparkles className={size === "lg" ? "w-6 h-6 text-primary" : "w-4 h-4 text-primary"} />
                </div>
              );
            };

            // ── Variant: card (padrão Zaia/Composio) ───────────────────────
            if (variant === "card") {
              const disabled = p.native || p.comingSoon;
              return (
                <button
                  key={p.provider}
                  type="button"
                  onClick={() => !disabled && openDialog(p)}
                  disabled={disabled}
                  className={`group relative aspect-[5/4] flex flex-col items-center justify-center gap-2 p-4 rounded-xl border bg-card transition-all text-center ${
                    p.comingSoon ? "cursor-not-allowed opacity-60"
                    : p.native ? "cursor-default opacity-90"
                    : "hover:border-primary/50 hover:bg-muted/30 hover:-translate-y-0.5 cursor-pointer"
                  } ${connected ? "border-emerald-500/40" : p.comingSoon ? "border-border border-dashed" : "border-border"}`}
                  title={p.comingSoon ? `${p.description} (em breve)` : p.description}
                >
                  {p.comingSoon ? (
                    <span className="absolute top-2 right-2 text-[9px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full">
                      Em breve
                    </span>
                  ) : connected && (
                    <span className="absolute top-2 right-2 flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-full">
                      <Check className="w-2.5 h-2.5" />
                      {p.native ? "Nativo" : "Conectado"}
                    </span>
                  )}
                  {renderLogo("lg")}
                  <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight">
                    {p.label}
                  </p>
                  {p.tags && p.tags.length > 0 && (
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70">
                      {TAG_LABELS[p.tags[0]]}
                    </span>
                  )}
                </button>
              );
            }

            // ── Variant: row (default — usado por LLMs) ────────────────────
            return (
              <div
                key={p.provider}
                className={`flex items-center justify-between py-3 px-3 rounded-lg transition-colors ${
                  p.comingSoon ? "opacity-60" : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {renderLogo("sm")}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{p.label}</p>
                      {p.comingSoon ? (
                        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full">
                          Em breve
                        </span>
                      ) : connected && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                          <Check className="w-2.5 h-2.5" /> {p.native ? "Nativo" : "Conectado"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                  </div>
                </div>
                {!p.native && !p.comingSoon && (
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
              {dialogProvider?.provider === "hubspot" && (
                <>
                  <img src={hubspotLogoLight.url} alt={dialogProvider.label} className="w-14 h-14 block dark:hidden object-contain" />
                  <img src={hubspotLogoDark.url} alt={dialogProvider.label} className="w-14 h-14 hidden dark:block object-contain" />
                </>
              )}
              {dialogProvider?.provider === "telnyx" && dialogProvider.logo && (
                <img src={dialogProvider.logo} alt={dialogProvider.label} className="w-14 h-14 object-contain" />
              )}
              {dialogProvider?.logo && !["hubspot", "telnyx"].includes(dialogProvider.provider) && (
                <img src={dialogProvider.logo} alt={dialogProvider.label} className={`w-8 h-8 rounded object-contain ${dialogProvider.provider === "openai" ? "dark:invert" : ""}`} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
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
            {/* OAuth Section — Google providers usam OAuth, não API key */}
            {dialogProvider && OAUTH_PROVIDERS.has(dialogProvider.provider) && (
              <div className="space-y-3">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-semibold text-foreground">Conectado</p>
                    <p className="text-xs text-muted-foreground">
                      O Aikortex usa OAuth seguro pra acessar {dialogProvider.label}. Sua senha nunca é compartilhada.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDialogProvider(null);
                      void startOAuthFlow(dialogProvider.provider);
                    }}
                    disabled={saving}
                    className="flex-1"
                  >
                    Reconectar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={saving}
                    className="flex-1 gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Desconectar
                  </Button>
                </div>

                {/* Config específica do provider — só pra HubSpot por enquanto.
                    Quando Pipedrive/RD entrarem em sync, dispatcha por provider. */}
                {dialogProvider.provider === "hubspot" && dialogIsConnected && (
                  <HubSpotSyncSettings />
                )}
              </div>
            )}

            {/* API Key Section — só pra providers que NÃO são OAuth */}
            {dialogProvider && !OAUTH_PROVIDERS.has(dialogProvider.provider) && (
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
            )}

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
              {/* OAuth: já tem Reconectar/Desconectar no topo, footer só mostra Fechar */}
              {dialogProvider && OAUTH_PROVIDERS.has(dialogProvider.provider) ? (
                <>
                  <div />
                  <Button variant="outline" size="sm" className="h-8" onClick={() => setDialogProvider(null)}>Fechar</Button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default IntegrationsGrid;
