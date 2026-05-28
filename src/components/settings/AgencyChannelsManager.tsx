import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Mic, Phone, Camera, Share2 } from "lucide-react";
import { type ChannelKey, useEnabledChannels, useToggleChannel } from "@/hooks/use-enabled-channels";

type ChannelDef = {
  key: ChannelKey;
  name: string;
  provider: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  comingSoon?: boolean;
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
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    provider: "Meta Cloud API",
    description: "Templates aprovados + auto-reply do agente",
    icon: MessageSquare,
    iconBg: "bg-[#25D366]/10",
    iconColor: "text-[#25D366]",
  },
  {
    key: "voice",
    name: "Voz",
    provider: "Telnyx + ElevenLabs",
    description: "Chamadas reais com voz sintética",
    icon: Mic,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-600",
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

  const enabledCount = CHANNELS.filter((c) => !c.comingSoon && enabled.includes(c.key)).length;
  const availableCount = CHANNELS.filter((c) => !c.comingSoon).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Canais disponíveis</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Ative aqui os canais que sua agência vai oferecer. Eles aparecerão no menu lateral
            de cada agente, em <strong>Canais</strong>.
          </p>
        </div>
        <Badge variant="outline" className="text-xs shrink-0">
          {enabledCount}/{availableCount} ativos
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CHANNELS.map((ch) => {
          const isEnabled = enabled.includes(ch.key);
          const isComingSoon = !!ch.comingSoon;
          const Icon = ch.icon;
          return (
            <Card
              key={ch.key}
              className={`p-3 flex items-start gap-3 transition-colors ${
                isComingSoon ? "opacity-60" : ""
              }`}
            >
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
            </Card>
          );
        })}
      </div>
    </div>
  );
}
