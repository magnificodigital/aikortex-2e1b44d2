import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Mail, Mic, Phone, Settings, CheckCircle2, FileText, ExternalLink } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import InstagramIcon from "@/components/icons/InstagramIcon";
import LinkedInIcon from "@/components/icons/LinkedInIcon";
import TikTokIcon from "@/components/icons/TikTokIcon";
import TelegramIcon from "@/components/icons/TelegramIcon";
import FacebookIcon from "@/components/icons/FacebookIcon";
import IntegrationEmailForm from "@/components/settings/IntegrationEmailForm";
import IntegrationWhatsAppForm from "@/components/settings/IntegrationWhatsAppForm";
import { loadFacebookSdk } from "@/components/settings/MetaEmbeddedSignupButton";
import { useMetaIntegration } from "@/hooks/use-meta-integration";
import { fnUrl } from "@/lib/supabase-url";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import EmailTemplatesPanel from "@/components/aikortex/EmailTemplatesPanel";
import WhatsAppTemplatesPanel from "@/components/aikortex/WhatsAppTemplatesPanel";
import { useEmailIntegrationStatus } from "@/hooks/use-email-integration";
import { useVoiceIntegrationStatus } from "@/hooks/use-voice-integration";
import { useWhatsAppIntegrationStatus } from "@/hooks/use-whatsapp-integration";
import { type ChannelKey, useEnabledChannels, useToggleChannel } from "@/hooks/use-enabled-channels";

type ConfigurableKey = "email" | "whatsapp" | "voice" | "instagram" | "facebook";
type TemplatesKey = "email" | "whatsapp";

type ChannelDef = {
  key: ChannelKey;
  name: string;
  provider: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  comingSoon?: boolean;
  configurable?: ConfigurableKey;
  templates?: TemplatesKey;
};

const CHANNELS: ChannelDef[] = [
  {
    key: "email",
    name: "Email",
    provider: "Resend",
    description: "Envie cadências, lembretes e mensagens transacionais direto pela sua caixa.",
    icon: Mail,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
    configurable: "email",
    templates: "email",
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    provider: "Meta Cloud API",
    description: "Atenda clientes no WhatsApp com templates aprovados e respostas automáticas do agente.",
    icon: WhatsAppIcon,
    iconBg: "bg-[#25D366]/10",
    iconColor: "text-[#25D366]",
    configurable: "whatsapp",
    templates: "whatsapp",
  },
  {
    key: "voice",
    name: "Voz",
    provider: "Telnyx + ElevenLabs",
    description: "Faça e receba chamadas reais com voz sintética natural do seu agente.",
    icon: Mic,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-600",
    configurable: "voice",
  },
  {
    key: "sms",
    name: "SMS",
    provider: "Twilio",
    description: "Dispare SMS transacionais e notificações rápidas para seus contatos.",
    icon: Phone,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600",
    comingSoon: true,
  },
  {
    key: "instagram",
    name: "Instagram",
    provider: "Meta API",
    description: "Responda DMs do Instagram Business automaticamente pelo seu agente.",
    icon: InstagramIcon,
    iconBg: "bg-pink-500/10",
    iconColor: "text-pink-600",
    configurable: "instagram",
  },
  {
    key: "facebook",
    name: "Facebook",
    provider: "Messenger API",
    description: "Converse no Messenger usando a mesma conexão Meta do Instagram.",
    icon: FacebookIcon,
    iconBg: "bg-[#1877F2]/10",
    iconColor: "text-[#1877F2]",
    configurable: "facebook",
  },
  {
    key: "linkedin",
    name: "LinkedIn",
    provider: "LinkedIn API",
    description: "Envie mensagens e InMail para prospects direto do LinkedIn.",
    icon: LinkedInIcon,
    iconBg: "bg-sky-500/10",
    iconColor: "text-sky-600",
    comingSoon: true,
  },
  {
    key: "tiktok",
    name: "TikTok",
    provider: "TikTok API",
    description: "Gerencie mensagens da sua conta TikTok Business em um só lugar.",
    icon: TikTokIcon,
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-600",
    comingSoon: true,
  },
  {
    key: "telegram",
    name: "Telegram",
    provider: "Telegram Bot API",
    description: "Crie um bot no Telegram e converse com seus clientes por lá.",
    icon: TelegramIcon,
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-600",
    comingSoon: true,
  },
];

export default function AgencyChannelsManager() {
  const { data: enabled = [] } = useEnabledChannels();
  const toggle = useToggleChannel();
  const { data: emailStatus } = useEmailIntegrationStatus();
  const { data: voiceStatus } = useVoiceIntegrationStatus();
  const { data: waStatus, refetch: refetchWa } = useWhatsAppIntegrationStatus();
  const [openDialog, setOpenDialog] = useState<ConfigurableKey | null>(null);
  const [openTemplates, setOpenTemplates] = useState<TemplatesKey | null>(null);
  const [igConnected, setIgConnected] = useState(false);
  const [fbConnected, setFbConnected] = useState(false);
  const [igUsername, setIgUsername] = useState<string | null>(null);
  const [fbPageName, setFbPageName] = useState<string | null>(null);
  const [connectingKey, setConnectingKey] = useState<"whatsapp" | "instagram" | "facebook" | null>(null);
  const [fbPagesToPick, setFbPagesToPick] = useState<{ id: string; name: string }[] | null>(null);
  const [waLocalConnected, setWaLocalConnected] = useState(false);
  const [manageChannel, setManageChannel] = useState<"instagram" | "facebook" | "whatsapp" | null>(null);
  const meta = useMetaIntegration();

  // PRE-CARREGA o SDK do Facebook assim que a pagina de Canais abre.
  // Sem isso, o 1o clique em "Conectar" acontecia com SDK ainda baixando:
  // o FB.login disparava fora da janela de ativacao do clique → popup
  // bloqueado → SDK caia em redirect de pagina inteira → tela preta.
  useEffect(() => {
    if (meta.loading) return;
    loadFacebookSdk(meta.appId).catch(() => { /* manual continua ok */ });
  }, [meta.loading, meta.appId]);

  // Status de Instagram e Facebook (tokens salvos?) — recarrega ao
  // fechar dialog e apos conexao.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_api_keys").select("provider, api_key")
        .eq("user_id", user.id)
        .in("provider", ["instagram_access_token", "facebook_page_token", "instagram_username", "facebook_page_name"]);
      const map = new Map((data ?? []).map((r: any) => [r.provider, r.api_key]));
      setIgConnected(map.has("instagram_access_token"));
      setFbConnected(map.has("facebook_page_token"));
      setIgUsername(map.get("instagram_username") ?? null);
      setFbPageName(map.get("facebook_page_name") ?? null);
    })();
  }, [openDialog, igConnected, fbConnected]);

  // ── Conexao dos canais Meta ──
  const disconnectMeta = async (key: "instagram" | "facebook" | "whatsapp") => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const providers = key === "instagram"
      ? ["instagram_access_token", "instagram_account_id", "instagram_agent_id"]
      : key === "facebook"
      ? ["facebook_page_token", "facebook_page_id"]
      : ["whatsapp_access_token", "whatsapp_phone_number_id", "whatsapp_business_account_id",
         "whatsapp_connection_type", "whatsapp_display_phone_number", "whatsapp_verified_name"];
    await supabase.from("user_api_keys").delete().eq("user_id", user.id).in("provider", providers);
    if (key === "instagram") setIgConnected(false);
    else if (key === "facebook") setFbConnected(false);
    else { setWaLocalConnected(false); refetchWa(); }
    setManageChannel(null);
    const label = key === "instagram" ? "Instagram" : key === "facebook" ? "Facebook" : "WhatsApp";
    toast.success(`${label} desconectado`);
  };

  // redirect_uri LIMPO (sem query) — o Instagram OAuth rejeita query
  // string no redirect. A aba Canais e' forcada pelo state no SettingsPage.
  const redirectUri = `${window.location.origin}/settings`;

  const finishInstagram = async (code: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Sessão expirada"); return; }
    const resp = await fetch(fnUrl("instagram-connect"), {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    });
    const j = await resp.json().catch(() => ({}));
    if (!resp.ok) { toast.error(j?.message || "Falha na conexão com o Instagram"); return; }
    if (j.connected) {
      setIgConnected(true);
      toast.success(`Instagram conectado${j.ig_username ? `: @${j.ig_username}` : ""} — DMs já caem no inbox`);
    }
  };

  const finishFacebook = async (body: { code?: string; page_id?: string }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Sessão expirada"); return; }
    const resp = await fetch(fnUrl("facebook-connect"), {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, redirect_uri: redirectUri }),
    });
    const j = await resp.json().catch(() => ({}));
    if (!resp.ok) { toast.error(j?.message || "Falha na conexão com o Facebook"); return; }
    if (j.needs_selection) { setFbPagesToPick(j.pages ?? []); return; }
    if (j.connected) {
      setFbPagesToPick(null);
      setFbConnected(true);
      const who = j.page_name ? `: ${j.page_name}` : "";
      if (j.webhook_subscribed) {
        toast.success(`Facebook conectado${who} — mensagens do Messenger caem no inbox`);
      } else {
        toast.warning(
          `Facebook conectado${who}, mas receber mensagens está pendente: falta pages_messaging/pages_manage_metadata no app Meta (produto Messenger). Adicione e reconecte.`,
          { duration: 12000 },
        );
      }
    }
  };

  // ── Retorno dos redirects OAuth ──
  //   state=ig_login → Instagram Login  |  state=fb_connect → Facebook
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (!code || (state !== "ig_login" && state !== "fb_connect")) return;
    window.history.replaceState({}, "", `${window.location.pathname}?tab=channels`);
    if (state === "ig_login") {
      setConnectingKey("instagram");
      finishInstagram(code).finally(() => setConnectingKey(null));
    } else {
      setConnectingKey("facebook");
      finishFacebook({ code }).finally(() => setConnectingKey(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watchdog do WhatsApp (popup)
  useEffect(() => {
    if (connectingKey !== "whatsapp") return;
    const t = setTimeout(() => {
      setConnectingKey(null);
      toast.error(
        "O popup da Meta não abriu. Abra o app numa aba própria (fora do editor) e libere popups do site.",
        { duration: 10000 },
      );
    }, 45000);
    return () => clearTimeout(t);
  }, [connectingKey]);

  /** Conexao por canal. Cada um usa o login NATIVO dele (sem popup, exceto
   *  WhatsApp que exige Embedded Signup). Sem config → abre o dialog. */
  const directConnect = (key: "whatsapp" | "instagram" | "facebook") => {
    if (key === "instagram") {
      if (!meta.instagramAppId) { toast.error("Instagram App ID não configurado pelo admin (Admin → Chaves de API)."); return; }
      setConnectingKey("instagram");
      // Login DIRETO com Instagram (sem Pagina do Facebook)
      window.location.href =
        `https://www.instagram.com/oauth/authorize` +
        `?client_id=${encodeURIComponent(meta.instagramAppId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent("instagram_business_basic,instagram_business_manage_messages")}` +
        `&state=ig_login`;
      return;
    }

    if (key === "facebook") {
      if (!meta.facebookConfigId) { toast.error("Config ID do Facebook não configurado pelo admin (Admin → Chaves de API)."); return; }
      setConnectingKey("facebook");
      window.location.href =
        `https://www.facebook.com/v21.0/dialog/oauth` +
        `?client_id=${encodeURIComponent(meta.appId)}` +
        `&config_id=${encodeURIComponent(meta.facebookConfigId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code&override_default_response_type=true&state=fb_connect`;
      return;
    }

    // WhatsApp
    if (!meta.whatsappConfigId) { setOpenDialog("whatsapp"); return; }
    if (!window.FB) { setOpenDialog("whatsapp"); return; }
    setConnectingKey("whatsapp");
    const cfgId = meta.whatsappConfigId;

    // WhatsApp Embedded Signup: o popup manda waba_id/phone_number_id via
    // postMessage ANTES do callback resolver com o code.
    // Coexistência (app + API) e Cloud API pura chegam com eventos diferentes:
    //  - FINISH                               → Cloud API pura
    //  - FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING → Coexistência (padrão nosso)
    let signupData: { phone_number_id?: string; waba_id?: string; coexistence?: boolean } = {};
    const messageHandler = (event: MessageEvent) => {
      // Aceita qualquer subdomínio *.facebook.com (a coexistência pode mandar
      // de business.facebook.com, não só www).
      let host = "";
      try { host = new URL(event.origin).host; } catch { return; }
      if (!host.endsWith("facebook.com")) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type !== "WA_EMBEDDED_SIGNUP") return;
        // eslint-disable-next-line no-console
        console.log("[wa-signup] evento Meta:", data?.event, data?.data);
        const finished = data?.event === "FINISH"
          || data?.event === "FINISH_ONLY_WABA"
          || data?.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING";
        if (finished && data?.data?.waba_id) {
          signupData = {
            phone_number_id: data?.data?.phone_number_id,
            waba_id: data?.data?.waba_id,
            coexistence: data?.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
          };
        }
      } catch { /* nao-JSON */ }
    };
    window.addEventListener("message", messageHandler);
    window.FB.login((response: any) => {
      window.removeEventListener("message", messageHandler);
      (async () => {
        try {
          // Pegamos o TOKEN direto (sem response_type=code) → backend troca
          // curto→longo via fb_exchange_token, sem redirect_uri (imune ao 36008).
          const token = response?.authResponse?.accessToken;
          if (token) {
            const { phone_number_id, waba_id, coexistence } = signupData;
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { toast.error("Sessão expirada"); return; }
            const resp = await fetch(fnUrl("whatsapp-embedded-signup"), {
              method: "POST",
              headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                access_token: token,
                phone_number_id,
                waba_id,
                coexistence: coexistence ?? true,
              }),
            });
            const j = await resp.json().catch(() => ({}));
            if (!resp.ok) { toast.error(j?.message || j?.error || "Falha ao salvar conexão"); return; }
            setWaLocalConnected(true);
            refetchWa();
            toast.success(coexistence
              ? "WhatsApp conectado (coexistência) — você continua usando o app no celular"
              : "WhatsApp Business conectado via Meta");
          } else if (response?.error) {
            toast.error(`Meta: ${response.error.message ?? "erro desconhecido"}`);
          } else {
            toast.error("Conexão cancelada ou a Meta não retornou o token.");
          }
        } finally {
          setConnectingKey(null);
        }
      })();
    }, {
      config_id: cfgId,
      // SEM response_type=code / override: assim o FB.login devolve o
      // accessToken direto e evitamos a troca de code (que dá 36008).
      extras: { setup: {}, featureType: "whatsapp_business_app_onboarding", sessionInfoVersion: "3" },
    });
  };

  const isConfigured = (k: ConfigurableKey): boolean => {
    if (k === "email") return !!emailStatus?.connected;
    if (k === "whatsapp") return !!waStatus?.connected || waLocalConnected;
    if (k === "voice") return !!(voiceStatus?.telnyx_connected || voiceStatus?.elevenlabs_connected);
    if (k === "instagram") return igConnected;
    if (k === "facebook") return fbConnected;
    return false;
  };

  const summaryFor = (k: ConfigurableKey): string | null => {
    if (k === "email") {
      if (emailStatus?.connected && emailStatus?.from_email) {
        const name = emailStatus.from_name?.trim();
        return name ? `${name} <${emailStatus.from_email}>` : emailStatus.from_email;
      }
      if ((emailStatus?.trial_remaining ?? 0) > 0) {
        return `${emailStatus?.trial_remaining} emails cortesia disponíveis`;
      }
    }
    if (k === "whatsapp" && (waStatus?.connected || waLocalConnected)) {
      const name = waStatus?.verified_name?.trim();
      const phone = waStatus?.display_phone_number?.trim();
      if (name && phone) return `${name} · ${phone}`;
      if (phone) return phone;
      if (name) return name;
      return waStatus?.phone_number_id_suffix ? `Phone ID ••••${waStatus.phone_number_id_suffix}` : "WhatsApp conectado";
    }
    if (k === "voice") {
      const parts: string[] = [];
      if (voiceStatus?.telnyx_connected) parts.push("Telnyx");
      if (voiceStatus?.elevenlabs_connected) parts.push("ElevenLabs");
      if (parts.length > 0) return parts.join(" + ");
    }
    if (k === "instagram" && igConnected) return igUsername ? `@${igUsername}` : "Conta Instagram conectada";
    if (k === "facebook" && fbConnected) return fbPageName || "Página do Facebook conectada";
    return null;
  };

  const enabledCount = CHANNELS.filter((c) => !c.comingSoon && enabled.includes(c.key)).length;
  const availableCount = CHANNELS.filter((c) => !c.comingSoon).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Canais</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ative os canais que sua agência vai oferecer e configure os provedores.
            Eles aparecem no menu lateral de cada agente.
          </p>
        </div>
        <Badge variant="outline" className="text-xs shrink-0 gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          {enabledCount}/{availableCount} ativos
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CHANNELS.map((ch) => {
          const isEnabled = enabled.includes(ch.key);
          const isComingSoon = !!ch.comingSoon;
          const Icon = ch.icon;
          const configured = ch.configurable ? isConfigured(ch.configurable) : false;
          const summary = ch.configurable ? summaryFor(ch.configurable) : null;

          return (
            <Card
              key={ch.key}
              className={`p-3 flex flex-col gap-3 transition-colors ${
                isComingSoon ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg ${ch.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${ch.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{ch.name}</p>
                    {isComingSoon ? (
                      <Badge variant="outline" className="text-[9px] shrink-0">Em breve</Badge>
                    ) : (
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(v) => toggle.mutate({ channel: ch.key, enabled: v })}
                        disabled={toggle.isPending}
                        className="scale-75 origin-right data-[state=unchecked]:bg-muted data-[state=checked]:bg-primary/70"
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">{ch.description}</p>
                </div>
              </div>

              {ch.configurable && !isComingSoon && isEnabled && (
                <div className="space-y-2 pt-2 mt-auto border-t border-border/50">
                  {configured ? (
                    // ── Conectado: status verde + Gerenciar ──
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[11px] min-w-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium truncate" title={summary ?? undefined}>
                          {summary || "Conectado"}
                        </span>
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {ch.templates && (
                          <Button variant="ghost" size="sm" className="text-xs h-7 gap-1.5 text-muted-foreground"
                            onClick={() => setOpenTemplates(ch.templates!)}>
                            <FileText className="w-3 h-3" /> Templates
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="text-xs h-7 gap-1.5 text-muted-foreground"
                          onClick={() => {
                            // IG/FB: gestao propria (status + reconectar + desconectar).
                            // WhatsApp/email/voz: dialog completo (identidade + agente + desconectar).
                            if (ch.key === "instagram" || ch.key === "facebook") setManageChannel(ch.key);
                            else setOpenDialog(ch.configurable!);
                          }}>
                          <Settings className="w-3 h-3" /> Gerenciar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // ── Nao conectado: um CTA unico com a cara do canal ──
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          className={`flex-1 h-8 text-xs gap-1.5 text-white ${
                            ch.key === "whatsapp"
                              ? "bg-[#25D366] hover:bg-[#1da851]"
                              : ch.key === "instagram"
                              ? "bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-700 hover:to-orange-600"
                              : ch.key === "facebook"
                              ? "bg-[#1877F2] hover:bg-[#0f6ae0]"
                              : ""
                          }`}
                          disabled={connectingKey !== null}
                          onClick={() => {
                            if (ch.key === "whatsapp" || ch.key === "instagram" || ch.key === "facebook") {
                              directConnect(ch.key);
                            } else {
                              setOpenDialog(ch.configurable!);
                            }
                          }}
                        >
                          {connectingKey === ch.key
                            ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Conectando…</>)
                            : <>Conectar {ch.name}</>}
                        </Button>
                        {/* Config manual so' pros canais sem login nativo (email/voz) */}
                        {ch.key !== "instagram" && ch.key !== "facebook" && ch.key !== "whatsapp" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground"
                            title="Configuração avançada"
                            onClick={() => setOpenDialog(ch.configurable!)}>
                            <Settings className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                      {/* WhatsApp: link discreto pra colar credenciais na mão (avançado) */}
                      {ch.key === "whatsapp" && (
                        <button type="button"
                          className="block mx-auto text-[10px] text-muted-foreground hover:text-foreground"
                          onClick={() => setOpenDialog("whatsapp")}>
                          conectar manualmente
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Dialog do Email */}
      <Dialog open={openDialog === "email"} onOpenChange={(o) => { if (!o) setOpenDialog(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-base">Email (Resend)</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Configuração do canal de disparo por email
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <IntegrationEmailForm onClose={() => setOpenDialog(null)} />
        </DialogContent>
      </Dialog>

      {/* Dialog do WhatsApp */}
      <Dialog open={openDialog === "whatsapp"} onOpenChange={(o) => { if (!o) { setOpenDialog(null); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#25D366]/10 flex items-center justify-center">
                <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
              </div>
              <div>
                <DialogTitle className="text-base">WhatsApp (Meta Cloud API)</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Configuração da conta WhatsApp Business para cadências e auto-reply
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <IntegrationWhatsAppForm onClose={() => setOpenDialog(null)} />
        </DialogContent>
      </Dialog>

      {/* Seletor de Pagina do Facebook (varias Paginas) */}
      <Dialog open={!!fbPagesToPick} onOpenChange={(o) => { if (!o) setFbPagesToPick(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Qual Página do Facebook usar?</DialogTitle>
            <DialogDescription className="text-xs">
              Você administra mais de uma Página — escolha qual conectar ao Messenger.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {(fbPagesToPick ?? []).map((p) => (
              <button
                key={p.id}
                onClick={() => finishFacebook({ page_id: p.id })}
                className="w-full text-left text-sm px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/50 transition"
              >
                <span className="font-medium">{p.name}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de gestao IG / FB / WhatsApp (status + reconectar + desconectar) */}
      <Dialog open={!!manageChannel} onOpenChange={(o) => { if (!o) setManageChannel(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Gerenciar {manageChannel === "instagram" ? "Instagram" : manageChannel === "facebook" ? "Facebook Messenger" : "WhatsApp"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {manageChannel === "instagram"
                ? "Conta Instagram conectada — DMs caem no inbox com resposta do agente."
                : manageChannel === "facebook"
                ? "Página do Facebook conectada — mensagens do Messenger caem no inbox."
                : "Conta WhatsApp Business conectada — mensagens caem no inbox com resposta do agente."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-xs min-w-0">
                <p className="truncate">
                  <span className="font-semibold">
                    {manageChannel === "instagram"
                      ? (igUsername ? `@${igUsername}` : "Conta Instagram")
                      : manageChannel === "facebook"
                      ? (fbPageName || "Página do Facebook")
                      : (waStatus?.verified_name && waStatus?.display_phone_number
                          ? `${waStatus.verified_name} · ${waStatus.display_phone_number}`
                          : waStatus?.display_phone_number || waStatus?.verified_name || "WhatsApp Business")}
                  </span>
                  {" "}— conectado e ativo.
                </p>
                {manageChannel === "whatsapp" && waStatus?.connection_type === "meta_coexistence" && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Coexistência — você continua usando o app no celular normalmente.
                  </p>
                )}
              </div>
            </div>

            {manageChannel === "whatsapp" && (
              <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5"
                onClick={() => { setManageChannel(null); setOpenTemplates("whatsapp"); }}>
                <FileText className="w-3 h-3" /> Criar / gerenciar templates
              </Button>
            )}

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs"
                onClick={() => { const k = manageChannel!; setManageChannel(null); directConnect(k); }}>
                Reconectar / trocar conta
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs text-destructive hover:text-destructive"
                onClick={() => disconnectMeta(manageChannel!)}>
                Desconectar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog da Voz — redireciona pras tabs corretas (Provedores + Conectores) */}
      <Dialog open={openDialog === "voice"} onOpenChange={(o) => { if (!o) setOpenDialog(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Mic className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <DialogTitle className="text-base">Voz</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Voz é composta por dois provedores. Configure cada um na sua aba dedicada.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-2 mt-2">
            <a
              href="/settings?tab=providers"
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">ElevenLabs</p>
                <p className="text-[11px] text-muted-foreground">
                  Síntese de voz (TTS) — em <span className="text-foreground">Provedores</span>
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>

            <a
              href="/settings?tab=integrations"
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">Telnyx</p>
                <p className="text-[11px] text-muted-foreground">
                  Telefonia (números reais, inbound + outbound) — em <span className="text-foreground">Conectores</span>
                </p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          </div>
        </DialogContent>
      </Dialog>

      {/* Templates de Email */}
      <Dialog open={openTemplates === "email"} onOpenChange={(o) => { if (!o) setOpenTemplates(null); }}>
        <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-base">Templates de Email</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Layouts reusáveis com assunto, corpo formatado e variáveis. Selecionáveis em qualquer cadência de email.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <EmailTemplatesPanel />
        </DialogContent>
      </Dialog>

      {/* Templates de WhatsApp */}
      <Dialog open={openTemplates === "whatsapp"} onOpenChange={(o) => { if (!o) setOpenTemplates(null); }}>
        <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#25D366]/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#25D366]" />
              </div>
              <div>
                <DialogTitle className="text-base">Templates de WhatsApp</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Templates aprovados pela Meta — usados em cadências WhatsApp pra contatar fora da janela de 24h.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <WhatsAppTemplatesPanel />
        </DialogContent>
      </Dialog>
    </div>
  );
}
