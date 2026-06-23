import { useState } from "react";
import { CheckCircle2, AlertCircle, Settings, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import IntegrationVoiceForm from "@/components/settings/IntegrationVoiceForm";
import { useVoiceIntegrationStatus } from "@/hooks/use-voice-integration";

/**
 * Status compacto das chaves de voz da agência (Telnyx + ElevenLabs).
 * Não duplica o form completo — só mostra OK/falta com link pra editar.
 * Form pleno fica em Configurações da Agência. Aqui só agente vê status.
 */
export default function VoiceProviderStatus() {
  const { data: status, isLoading } = useVoiceIntegrationStatus();
  const [open, setOpen] = useState(false);

  if (isLoading) return null;

  const telnyxOk = !!status?.telnyx_connected;
  const elevenOk = !!status?.elevenlabs_connected;
  const allOk = telnyxOk && elevenOk;
  const missing: string[] = [];
  if (!telnyxOk) missing.push("Telnyx");
  if (!elevenOk) missing.push("ElevenLabs");

  return (
    <>
      <div
        className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${
          allOk ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {allOk ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">
              {allOk
                ? "Provedores conectados — pronto pra ligar"
                : `Falta configurar ${missing.join(" + ")}`}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge
                variant="outline"
                className={`text-[10px] h-4 px-1 ${
                  telnyxOk ? "border-emerald-500/40 text-emerald-600" : "border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {telnyxOk ? "✓" : "•"} Telnyx
              </Badge>
              <Badge
                variant="outline"
                className={`text-[10px] h-4 px-1 ${
                  elevenOk ? "border-emerald-500/40 text-emerald-600" : "border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {elevenOk ? "✓" : "•"} ElevenLabs
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                · chaves compartilhadas entre todos os agentes da agência
              </span>
            </div>
          </div>
        </div>
        <Button size="sm" variant={allOk ? "ghost" : "outline"} className="shrink-0 gap-1.5" onClick={() => setOpen(true)}>
          <Settings className="w-3.5 h-3.5" />
          {allOk ? "Editar" : "Configurar"}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">Chaves de voz da agência</DialogTitle>
            <DialogDescription>
              Configure uma vez e use em todos os agentes. Form completo idêntico ao de{" "}
              <a
                href="/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex items-center gap-0.5 hover:underline"
              >
                Configurações da Agência <ExternalLink className="w-3 h-3" />
              </a>
              .
            </DialogDescription>
          </DialogHeader>
          <IntegrationVoiceForm onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
