import { MessageSquare, Phone, Mic } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import IntegrationEmailCard from "@/components/settings/IntegrationEmailCard";

const PLACEHOLDER_CHANNELS = [
  { icon: MessageSquare, label: "WhatsApp (Meta Cloud API)", desc: "Templates aprovados e disparos via WABA. Disponível no próximo sprint." },
  { icon: Phone, label: "SMS (Twilio)", desc: "Envio de SMS transacional. Em breve." },
  { icon: Mic, label: "Voz (ElevenLabs / Telnyx)", desc: "Chamadas com voz sintética. Em breve." },
];

/**
 * Bloco "Canais de Disparo" reutilizado em:
 *   - Settings → Integrações (IntegrationsPanel)
 *   - Agente → Recursos → Integrações (AgentRightPanel)
 *
 * Mantém UI idêntica nos dois lugares pra que a agência configure email/whatsapp/sms
 * de qualquer entrada do app e veja o mesmo estado.
 */
export default function OutboundChannelsBlock() {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Canais de Disparo</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Conecte provedores para que cadências e automações enviem mensagens.
        </p>
      </div>
      <IntegrationEmailCard />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {PLACEHOLDER_CHANNELS.map((ch) => (
          <Card key={ch.label} className="opacity-70">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                    <ch.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-xs">{ch.label}</CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">Em breve</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-[11px]">{ch.desc}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
