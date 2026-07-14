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
import IntegrationInstagramForm from "@/components/settings/IntegrationInstagramForm";
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
  const { data: waStatus } = useWhatsAppIntegrationStatus();
  const [openDialog, setOpenDialog] = useState<ConfigurableKey | null>(null);
  const [openTemplates, setOpenTemplates] = useState<TemplatesKey | null>(null);
  const [igConnected, setIgConnected] = useState(false);
  const meta = useMetaIntegration();

  // PRE-CARREGA o SDK do Facebook assim que a pagina de Canais abre.
  // Sem isso, o 1o clique em "Conectar" acontecia com SDK ainda baixando:
  // o FB.login disparava fora da janela de ativacao do clique → popup
  // bloqueado → SDK caia em redirect de pagina inteira → tela preta.
  useEffect(() => {
    if (meta.loading) return;
    loadFacebookSdk(meta.appId).catch(() => { /* manual continua ok */ });
  }, [meta.loading, meta.appId]);

  // Status do Instagram: tem access token salvo? (recarrega ao fechar dialog)
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_api_keys").select("provider")
        .eq("user_id", user.id).eq("provider", "instagram_access_token").limit(1);
      setIgConnected(!!data?.length);
    })();
  }, [openDialog]);

  // ── Conexao 1-clique DIRETO no card (FB.login no gesto sincrono) ──
  const [connectingKey, setConnectingKey] = useState<"whatsapp" | "instagram" | null>(null);
  const [igPagesToPick, setIgPagesToPick] = useState<{ id: string; name: string; ig_username: string | null }[] | null>(null);
  const [waLocalConnected, setWaLocalConnected] = useState(false);

  // ── Retorno do OAuth do Instagram (redirect flow) ──
  // O Facebook volta em /settings?tab=channels&code=...&state=ig_connect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (!code || state !== "ig_connect") return;
    // Limpa a URL (evita re-troca do code em refresh — code e' single-use)
    window.history.replaceState({}, "", `${window.location.pathname}?tab=channels`);
    setConnectingKey("instagram");
    finishInstagram({ code, redirect_uri: `${window.location.origin}/settings?tab=channels` })
      .finally(() => setConnectingKey(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watchdog: popup sem resposta (bloqueado / dentro do editor Lovable)
  useEffect(() => {
    if (!connectingKey) return;
    const t = setTimeout(() => {
      setConnectingKey(null);
      toast.error(
        "O popup da Meta não abriu. Se você está dentro do editor do Lovable, abra o app numa aba própria; e confira o bloqueio de popups do navegador.",
        { duration: 10000 },
      );
    }, 45000);
    return () => clearTimeout(t);
  }, [connectingKey]);

  // URI de retorno do OAuth (redirect flow). PRECISA estar registrada
  // exatamente assim em "URIs de redirecionamento do OAuth válidos" no app
  // Meta (agents + preview).
  const igRedirectUri = `${window.location.origin}/settings?tab=channels`;

  const finishInstagram = async (body: { code?: string; page_id?: string; redirect_uri?: string }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Sessão expirada"); return; }
    const resp = await fetch(fnUrl("instagram-embedded-signup"), {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await resp.json().catch(() => ({}));
    if (!resp.ok) { toast.error(j?.message || "Falha na conexão com o Instagram"); return; }
    if (j.needs_selection) { setIgPagesToPick(j.pages ?? []); return; }
    if (j.connected) {
      setIgPagesToPick(null);
      setIgConnected(true);
      toast.success(`Instagram conectado${j.ig_username ? `: @${j.ig_username}` : ""} — DMs já caem no inbox`);
    }
  };

  /** Conexao 1-clique. Instagram = redirect flow (sem SDK, sem popup).
   *  WhatsApp ES = popup obrigatorio (a Meta so entrega waba/phone ids por
   *  postMessage). Fallback: sem config → abre o dialog de gestao. */
  const directConnect = (key: "whatsapp" | "instagram" | "facebook") => {
    const cfgId = key === "whatsapp" ? meta.whatsappConfigId : meta.instagramConfigId;
    if (!cfgId) { setOpenDialog(key === "facebook" ? "instagram" : key); return; }
    if (key === "whatsapp" && !window.FB) { setOpenDialog(key); return; }
    setConnectingKey(key === "facebook" ? "instagram" : key);

    if (key === "instagram" || key === "facebook") {
      // REDIRECT flow (sem popup): navega pro Facebook, autoriza, volta em
      // /settings?tab=channels&code=... — imune a bloqueador de popup.
      const authUrl =
        `https://www.facebook.com/v21.0/dialog/oauth` +
        `?client_id=${encodeURIComponent(meta.appId)}` +
        `&config_id=${encodeURIComponent(cfgId)}` +
        `&redirect_uri=${encodeURIComponent(igRedirectUri)}` +
        `&response_type=code` +
        `&override_default_response_type=true` +
        `&state=ig_connect`;
      window.location.href = authUrl;
      return;
    }

    // WhatsApp Embedded Signup: o popup manda waba_id/phone_number_id via
    // postMessage ANTES do callback resolver com o code.
    let signupData: { phone_number_id?: string; waba_id?: string } = {};
    const messageHandler = (event: MessageEvent) => {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type === "WA_EMBEDDED_SIGNUP" && data?.event === "FINISH") {
          signupData = { phone_number_id: data?.data?.phone_number_id, waba_id: data?.data?.waba_id };
        }
      } catch { /* nao-JSON */ }
    };
    window.addEventListener("message", messageHandler);
    window.FB.login((response: any) => {
      window.removeEventListener("message", messageHandler);
      (async () => {
        try {
          if (response?.authResponse?.code) {
            const { phone_number_id, waba_id } = signupData;
            if (!phone_number_id || !waba_id) {
              toast.error("Onboarding incompleto: faltaram dados do número selecionado");
              return;
            }
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { toast.error("Sessão expirada"); return; }
            const resp = await fetch(fnUrl("whatsapp-embedded-signup"), {
              method: "POST",
              headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
              body: JSON.stringify({ code: response.authResponse.code, phone_number_id, waba_id }),
            });
            const j = await resp.json().catch(() => ({}));
            if (!resp.ok) { toast.error(j?.message || j?.error || "Falha ao salvar conexão"); return; }
            setWaLocalConnected(true);
            toast.success("WhatsApp Business conectado via Meta");
          } else if (response?.error) {
            toast.error(`Meta: ${response.error.message ?? "erro desconhecido"}`);
          }
        } finally {
          setConnectingKey(null);
        }
      })();
    }, {
      config_id: cfgId,
      response_type: "code",
      override_default_response_type: true,
      extras: { setup: {}, featureType: "whatsapp_business_app_onboarding" },
    });
  };

  const isConfigured = (k: ConfigurableKey): boolean => {
    if (k === "email") return !!emailStatus?.connected;
    if (k === "whatsapp") return !!waStatus?.connected || waLocalConnected;
    if (k === "voice") return !!(voiceStatus?.telnyx_connected || voiceStatus?.elevenlabs_connected);
    if (k === "instagram") return igConnected;
    if (k === "facebook") return igConnected; // mesma Pagina/token da conexao Meta
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
    if (k === "whatsapp" && waStatus?.connected) {
      return waStatus.phone_number_id_suffix ? `Phone ID ••••${waStatus.phone_number_id_suffix}` : "WABA configurada";
    }
    if (k === "voice") {
      const parts: string[] = [];
      if (voiceStatus?.telnyx_connected) parts.push("Telnyx");
      if (voiceStatus?.elevenlabs_connected) parts.push("ElevenLabs");
      if (parts.length > 0) return parts.join(" + ");
    }
    if (k === "instagram" && igConnected) return "Conta Business conectada";
    if (k === "facebook" && igConnected) return "Página conectada (via login Meta)";
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
                    // ── Conectado: status verde + acoes discretas ──
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[11px] min-w-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium truncate" title={summary ?? undefined}>
                          {summary || "Conectado"}
                        </span>
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {ch.templates && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 gap-1.5 text-muted-foreground"
                            onClick={() => setOpenTemplates(ch.templates!)}
                          >
                            <FileText className="w-3 h-3" /> Templates
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 gap-1.5 text-muted-foreground"
                          onClick={() => setOpenDialog(ch.configurable === "facebook" ? "instagram" : ch.configurable!)}
                        >
                          <Settings className="w-3 h-3" /> Gerenciar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // ── Nao conectado: CTA forte com a cara do canal ──
                    <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      className={`flex-1 h-8 text-xs gap-1.5 text-white ${
                        ch.key === "whatsapp"
                          ? "bg-[#25D366] hover:bg-[#1da851]"
                          : ch.key === "instagram"
                          ? "bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-700 hover:to-orange-600"
                          : ""
                      }`}
                      disabled={connectingKey !== null}
                      onClick={() => {
                        // 1 clique: FB.login no proprio gesto → popup garantido.
                        if (ch.key === "whatsapp" || ch.key === "instagram" || ch.key === "facebook") {
                          directConnect(ch.key);
                        } else {
                          setOpenDialog(ch.configurable!);
                        }
                      }}
                    >
                      {connectingKey === ch.key || (ch.key === "facebook" && connectingKey === "instagram")
                        ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" /> Conectando…</>)
                        : <>Conectar {ch.name}</>}
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground"
                      title="Configuração manual / avançado"
                      onClick={() => setOpenDialog(ch.configurable === "facebook" ? "instagram" : ch.configurable!)}
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </Button>
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

      {/* Seletor de Pagina (conexao Instagram com varias Paginas) */}
      <Dialog open={!!igPagesToPick} onOpenChange={(o) => { if (!o) setIgPagesToPick(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Qual conta Instagram usar?</DialogTitle>
            <DialogDescription className="text-xs">
              Você administra mais de uma Página com Instagram — escolha qual conectar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {(igPagesToPick ?? []).map((p) => (
              <button
                key={p.id}
                onClick={() => finishInstagram({ page_id: p.id })}
                className="w-full text-left text-sm px-3 py-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/50 transition"
              >
                <span className="font-medium">{p.ig_username ? `@${p.ig_username}` : p.name}</span>
                <span className="text-muted-foreground text-xs"> — Página {p.name}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog do Instagram */}
      <Dialog open={openDialog === "instagram"} onOpenChange={(o) => { if (!o) { setOpenDialog(null); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <InstagramIcon className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <DialogTitle className="text-base">Instagram (Meta API)</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  DMs da conta Business no inbox, com auto-reply do agente
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <IntegrationInstagramForm onClose={() => setOpenDialog(null)} />
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
