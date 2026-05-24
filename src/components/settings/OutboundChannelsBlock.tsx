import { useState } from "react";
import { Mail, MessageSquare, Phone, Mic, CheckCircle2, Settings } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import IntegrationEmailForm from "@/components/settings/IntegrationEmailForm";
import IntegrationVoiceForm from "@/components/settings/IntegrationVoiceForm";
import { useEmailIntegrationStatus } from "@/hooks/use-email-integration";
import { useVoiceIntegrationStatus } from "@/hooks/use-voice-integration";

type ChannelStatus = "connected" | "disconnected" | "coming_soon";

type ChannelDef = {
  key: "email" | "whatsapp" | "sms" | "voice";
  name: string;
  provider: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  description: string;
};

const CHANNELS: ChannelDef[] = [
  {
    key: "email",
    name: "Email",
    provider: "Resend",
    icon: Mail,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    description: "Disparos transacionais e cadências por email.",
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    provider: "Meta Cloud API",
    icon: WhatsAppIcon,
    iconBg: "bg-[#25D366]/10",
    iconColor: "text-[#25D366]",
    description: "Templates aprovados via WABA.",

  },
  {
    key: "sms",
    name: "SMS",
    provider: "Twilio",
    icon: Phone,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    description: "Envio de SMS transacional.",
  },
  {
    key: "voice",
    name: "Voz",
    provider: "Telnyx + ElevenLabs",
    icon: Mic,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-600 dark:text-purple-400",
    description: "Telefonia (Telnyx) e síntese de voz (ElevenLabs) para chamadas e voice mode.",
  },
];

function StatusDot({ status }: { status: ChannelStatus }) {
  const map = {
    connected: "bg-emerald-500",
    disconnected: "bg-muted-foreground/40",
    coming_soon: "bg-amber-500/60",
  };
  return <span className={`w-2 h-2 rounded-full ${map[status]}`} aria-hidden />;
}

function StatusLabel({ status }: { status: ChannelStatus }) {
  if (status === "connected") return <span className="text-emerald-600 dark:text-emerald-400">Ativo</span>;
  if (status === "coming_soon") return <span className="text-muted-foreground">Em breve</span>;
  return <span className="text-muted-foreground">Não conectado</span>;
}

export default function OutboundChannelsBlock() {
  const { data: emailStatus } = useEmailIntegrationStatus();
  const { data: voiceStatus } = useVoiceIntegrationStatus();
  const [openDialog, setOpenDialog] = useState<ChannelDef["key"] | null>(null);

  const statusFor = (key: ChannelDef["key"]): ChannelStatus => {
    if (key === "email") {
      return emailStatus?.connected ? "connected" : "disconnected";
    }
    if (key === "voice") {
      // Voz é canal "ativo" se pelo menos um dos 2 provedores (Telnyx ou ElevenLabs) estiver conectado.
      return (voiceStatus?.telnyx_connected || voiceStatus?.elevenlabs_connected)
        ? "connected"
        : "disconnected";
    }
    return "coming_soon";
  };

  const summaryFor = (key: ChannelDef["key"]): string | null => {
    if (key === "email") {
      if (emailStatus?.connected && emailStatus?.from_email) {
        const name = emailStatus.from_name?.trim();
        return name ? `${name} <${emailStatus.from_email}>` : emailStatus.from_email;
      }
      if ((emailStatus?.trial_remaining ?? 0) > 0) {
        return `${emailStatus?.trial_remaining} emails cortesia disponíveis`;
      }
    }
    if (key === "voice") {
      const parts: string[] = [];
      if (voiceStatus?.telnyx_connected) parts.push("Telnyx");
      if (voiceStatus?.elevenlabs_connected) parts.push("ElevenLabs");
      if (parts.length > 0) return parts.join(" + ");
    }
    return null;
  };

  const connectedCount = CHANNELS.filter((c) => statusFor(c.key) === "connected").length;
  const totalActive = CHANNELS.filter((c) => statusFor(c.key) !== "coming_soon").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Canais de Disparo</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Conecte provedores para que cadências e automações enviem mensagens.
          </p>
        </div>
        <Badge variant="outline" className="text-xs gap-1 shrink-0">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          {connectedCount}/{totalActive} ativo{totalActive === 1 ? "" : "s"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {CHANNELS.map((ch) => {
          const status = statusFor(ch.key);
          const summary = summaryFor(ch.key);
          const isDisabled = status === "coming_soon";
          const Icon = ch.icon;

          return (
            <Card
              key={ch.key}
              className={`group relative transition-all p-4 flex flex-col gap-3 ${
                isDisabled
                  ? "opacity-60"
                  : "hover:border-primary/40 hover:shadow-sm cursor-pointer"
              }`}
              onClick={() => {
                if (!isDisabled) setOpenDialog(ch.key);
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`w-10 h-10 rounded-lg ${ch.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${ch.iconColor}`} />
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <StatusDot status={status} />
                  <StatusLabel status={status} />
                </div>
              </div>

              <div className="space-y-0.5 min-h-[44px]">
                <p className="text-sm font-semibold text-foreground leading-tight">{ch.name}</p>
                <p className="text-[11px] text-muted-foreground">{ch.provider}</p>
              </div>

              {summary ? (
                <p className="text-[11px] text-foreground/70 font-mono truncate" title={summary}>
                  {summary}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground line-clamp-2">{ch.description}</p>
              )}

              {!isDisabled && (
                <Button
                  variant={status === "connected" ? "outline" : "default"}
                  size="sm"
                  className="text-xs h-8 mt-auto gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDialog(ch.key);
                  }}
                >
                  {status === "connected" ? (
                    <>
                      <Settings className="w-3 h-3" /> Editar
                    </>
                  ) : (
                    "Configurar"
                  )}
                </Button>
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

      {/* Dialog do Voz (Telnyx + ElevenLabs) */}
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
    </div>
  );
}
