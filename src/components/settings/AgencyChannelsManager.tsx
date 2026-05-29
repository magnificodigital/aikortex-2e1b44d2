import { useState } from "react";
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
import { Mail, Mic, Phone, Camera, Share2, Settings, CheckCircle2, FileText } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import IntegrationEmailForm from "@/components/settings/IntegrationEmailForm";
import IntegrationVoiceForm from "@/components/settings/IntegrationVoiceForm";
import IntegrationWhatsAppForm from "@/components/settings/IntegrationWhatsAppForm";
import EmailTemplatesPanel from "@/components/aikortex/EmailTemplatesPanel";
import WhatsAppTemplatesPanel from "@/components/aikortex/WhatsAppTemplatesPanel";
import { useEmailIntegrationStatus } from "@/hooks/use-email-integration";
import { useVoiceIntegrationStatus } from "@/hooks/use-voice-integration";
import { useWhatsAppIntegrationStatus } from "@/hooks/use-whatsapp-integration";
import { type ChannelKey, useEnabledChannels, useToggleChannel } from "@/hooks/use-enabled-channels";

type ConfigurableKey = "email" | "whatsapp" | "voice";
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
    description: "Cadências, lembretes, transacional",
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
    description: "Templates aprovados + auto-reply do agente",
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
    description: "Chamadas reais com voz sintética",
    icon: Mic,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-600",
    configurable: "voice",
  },
  {
    key: "sms",
    name: "SMS",
    provider: "Twilio",
    description: "Envio de SMS transacional",
    icon: Phone,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600",
    comingSoon: true,
  },
  {
    key: "instagram",
    name: "Instagram",
    provider: "Meta API",
    description: "DM via API do Instagram Business",
    icon: Camera,
    iconBg: "bg-pink-500/10",
    iconColor: "text-pink-600",
    comingSoon: true,
  },
  {
    key: "facebook",
    name: "Facebook",
    provider: "Messenger API",
    description: "Conversas via Messenger",
    icon: Share2,
    iconBg: "bg-blue-600/10",
    iconColor: "text-blue-600",
    comingSoon: true,
  },
  {
    key: "linkedin",
    name: "LinkedIn",
    provider: "LinkedIn API",
    description: "Mensagens e InMail",
    icon: Share2,
    iconBg: "bg-sky-500/10",
    iconColor: "text-sky-600",
    comingSoon: true,
  },
  {
    key: "tiktok",
    name: "TikTok",
    provider: "TikTok API",
    description: "Mensagens via TikTok Business",
    icon: Share2,
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-600",
    comingSoon: true,
  },
  {
    key: "telegram",
    name: "Telegram",
    provider: "Telegram Bot API",
    description: "Bot e conversas via Telegram",
    icon: Share2,
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

  const isConfigured = (k: ConfigurableKey): boolean => {
    if (k === "email") return !!emailStatus?.connected;
    if (k === "whatsapp") return !!waStatus?.connected;
    if (k === "voice") return !!(voiceStatus?.telnyx_connected || voiceStatus?.elevenlabs_connected);
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
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{ch.provider}</p>
                  <p className="text-[10px] text-muted-foreground/80 leading-snug pt-0.5">{ch.description}</p>
                </div>
              </div>

              {ch.configurable && !isComingSoon && isEnabled && (
                <div className="space-y-2 pt-1 border-t border-border/50">
                  {summary && (
                    <p className="text-[11px] text-foreground/70 font-mono truncate" title={summary}>
                      {summary}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[10px]">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          configured ? "bg-emerald-500" : "bg-muted-foreground/40"
                        }`}
                        aria-hidden
                      />
                      <span className={configured ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
                        {configured ? "Provedor conectado" : "Provedor não conectado"}
                      </span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      {ch.templates && configured && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 gap-1.5"
                          onClick={() => setOpenTemplates(ch.templates!)}
                        >
                          <FileText className="w-3 h-3" /> Templates
                        </Button>
                      )}
                      <Button
                        variant={configured ? "outline" : "default"}
                        size="sm"
                        className="text-xs h-7 gap-1.5"
                        onClick={() => setOpenDialog(ch.configurable!)}
                      >
                        <Settings className="w-3 h-3" /> Gerenciar
                      </Button>
                    </div>
                  </div>
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
      <Dialog open={openDialog === "whatsapp"} onOpenChange={(o) => { if (!o) setOpenDialog(null); }}>
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

      {/* Dialog da Voz (Telnyx + ElevenLabs) */}
      <Dialog open={openDialog === "voice"} onOpenChange={(o) => { if (!o) setOpenDialog(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Mic className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <DialogTitle className="text-base">Voz (Telnyx + ElevenLabs)</DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Configuração do canal de voz: telefonia e síntese de fala
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <IntegrationVoiceForm onClose={() => setOpenDialog(null)} />
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
