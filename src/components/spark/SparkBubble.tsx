import { useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface SparkBubbleProps {
  /** Modo de chegada na pagina:
   *  - "voice": user chegou aqui falando com Spark; bubble fica ATIVO (clicavel,
   *    pulsa, pronto pra continuar conversa por voz).
   *  - "text": user chegou aqui digitando; bubble fica visivel mas DESATIVADO
   *    (cinza, nao clicavel) — apenas sinaliza que Spark esta presente. */
  mode: "voice" | "text";
}

export function SparkBubble({ mode }: SparkBubbleProps) {
  const [expanded, setExpanded] = useState(false);
  const active = mode === "voice";

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {expanded && active && (
        <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-xl p-3 max-w-xs">
          <p className="text-xs text-muted-foreground">
            Spark está te ouvindo. Continue a conversa por voz pra responder ao wizard.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => active && setExpanded((e) => !e)}
        disabled={!active}
        aria-label={active ? "Falar com Spark" : "Spark desativado"}
        title={active ? "Falar com Spark" : "Spark desativado (você chegou aqui por texto)"}
        className={cn(
          "relative w-14 h-14 rounded-full grid place-items-center transition-all",
          "border-2 backdrop-blur-md shadow-xl",
          active
            ? "bg-primary/20 border-primary/50 hover:scale-105 cursor-pointer"
            : "bg-muted/40 border-border opacity-60 cursor-not-allowed grayscale",
        )}
      >
        {active && (
          <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        )}
        {active ? (
          <Mic className="w-5 h-5 text-primary" />
        ) : (
          <MicOff className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
