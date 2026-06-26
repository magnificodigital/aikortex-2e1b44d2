import { CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useVoiceIntegrationStatus } from "@/hooks/use-voice-integration";

/**
 * Status compacto dos provedores de voz (Telnyx + ElevenLabs).
 *
 * Mudanca de arquitetura (Master v7.5):
 * - ElevenLabs vive em Configurações → Provedores (TTS)
 * - Telnyx vive em Configurações → Conectores (telefonia)
 *
 * Aqui o agente so VE o status com link direto. Form de chave nao
 * aparece aqui — evita duplicacao da fonte de verdade.
 */
export default function VoiceProviderStatus() {
  const { data: status, isLoading } = useVoiceIntegrationStatus();
  if (isLoading) return null;

  const telnyxOk = !!status?.telnyx_connected;
  const elevenOk = !!status?.elevenlabs_connected;
  const allOk = telnyxOk && elevenOk;

  return (
    <div
      className={`rounded-lg border p-3 ${
        allOk ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"
      }`}
    >
      <div className="flex items-start gap-2">
        {allOk ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground">
            {allOk ? "Provedores conectados — pronto pra ligar" : "Conecte os provedores pra habilitar voz"}
          </p>

          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <a
              href="/settings?tab=providers"
              className="inline-flex items-center gap-1 hover:underline"
              title="Abrir Configurações → Provedores"
            >
              <Badge
                variant="outline"
                className={`text-[10px] h-5 px-1.5 gap-1 ${
                  elevenOk
                    ? "border-emerald-500/40 text-emerald-600"
                    : "border-amber-500/40 text-amber-600"
                }`}
              >
                {elevenOk ? "✓" : "·"} ElevenLabs
                <ExternalLink className="w-2.5 h-2.5" />
              </Badge>
            </a>

            <a
              href="/settings?tab=integrations"
              className="inline-flex items-center gap-1 hover:underline"
              title="Abrir Configurações → Conectores"
            >
              <Badge
                variant="outline"
                className={`text-[10px] h-5 px-1.5 gap-1 ${
                  telnyxOk
                    ? "border-emerald-500/40 text-emerald-600"
                    : "border-amber-500/40 text-amber-600"
                }`}
              >
                {telnyxOk ? "✓" : "·"} Telnyx
                <ExternalLink className="w-2.5 h-2.5" />
              </Badge>
            </a>
          </div>

          <p className="text-[10px] text-muted-foreground mt-1.5">
            ElevenLabs em <span className="text-foreground">Provedores</span> (TTS), Telnyx em{" "}
            <span className="text-foreground">Conectores</span> (telefonia). Compartilhadas entre todos agentes.
          </p>
        </div>
      </div>
    </div>
  );
}
