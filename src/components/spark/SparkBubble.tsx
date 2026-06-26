import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SparkBubbleProps {
  /** Modo de chegada:
   *  - "voice": bubble ATIVO HANDS-FREE — auto-escuta o user sem precisar
   *    de click. Captura voz, manda pro wizard, espera resposta, escuta dnv.
   *  - "text":  bubble visivel mas DESATIVADO — so sinal de presenca. */
  mode: "voice" | "text";
  /** Wizard esta processando a mensagem anterior. Bubble fica em hold. */
  isProcessing?: boolean;
  /** Bubble entrega fala capturada pra parent (AgentDetail forwarda
   *  pro wizardChat.sendMessage). */
  onTranscript?: (text: string) => void;
}

// Tempo pra esperar Spark terminar de falar o script de boas-vindas
// antes de comecar a escutar (~10s do TTS + folga).
const INITIAL_TTS_GUARD_MS = 12_000;
// Delay curto entre wizard terminar de responder e bubble re-ativar.
const RESUME_DELAY_MS = 600;

export function SparkBubble({ mode, isProcessing, onTranscript }: SparkBubbleProps) {
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState("");
  const [userStopped, setUserStopped] = useState(false);

  const recognitionRef = useRef<any>(null);
  const finalTextRef = useRef("");
  const onTranscriptRef = useRef(onTranscript);
  const ranInitialGuardRef = useRef(false);

  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  const active = mode === "voice";

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* noop */ }
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.warn("[spark-bubble] SpeechRecognition nao suportado neste browser");
      return;
    }

    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = false;       // para sozinho na pausa natural
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    finalTextRef.current = "";

    rec.onresult = (event: any) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (final) finalTextRef.current += final;
      setPartial((finalTextRef.current + " " + interim).trim());
    };

    rec.onerror = (e: any) => {
      console.warn("[spark-bubble] recognition error:", e?.error);
      setListening(false);
      recognitionRef.current = null;
      setPartial("");
    };

    rec.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      const text = finalTextRef.current.trim();
      finalTextRef.current = "";
      setPartial("");
      if (text && text.length >= 2) {
        const cb = onTranscriptRef.current;
        if (cb) cb(text);
      }
    };

    try {
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch (e) {
      console.warn("[spark-bubble] start falhou:", e);
    }
  }, []);

  // Auto-listen hands-free. Dispara em 3 momentos:
  //  1) Mount inicial em voz: espera INITIAL_TTS_GUARD_MS pra Spark terminar
  //     de falar, depois liga (uma vez so).
  //  2) Quando wizard acaba de responder (isProcessing transita true->false):
  //     religa apos RESUME_DELAY_MS pro user responder o proximo turno.
  //  3) Se user clicou pra parar (userStopped=true), NAO religa — fica off
  //     ate o user clicar pra retomar.
  useEffect(() => {
    if (!active) return;
    if (listening) return;
    if (isProcessing) return;
    if (userStopped) return;

    const delay = ranInitialGuardRef.current ? RESUME_DELAY_MS : INITIAL_TTS_GUARD_MS;
    const t = window.setTimeout(() => {
      ranInitialGuardRef.current = true;
      if (!recognitionRef.current && !isProcessing && !userStopped) {
        startListening();
      }
    }, delay);
    return () => window.clearTimeout(t);
  }, [active, listening, isProcessing, userStopped, startListening]);

  // Cleanup no unmount
  useEffect(() => () => stopListening(), [stopListening]);

  const handleClick = () => {
    if (!active) return;
    if (isProcessing) return;
    if (listening) {
      setUserStopped(true);
      stopListening();
    } else {
      setUserStopped(false);
      startListening();
    }
  };

  const labelTop = (() => {
    if (!active) return null;
    if (isProcessing) return "Wizard está pensando…";
    if (userStopped && !listening) return "Toque pra retomar";
    if (listening) return partial || "Estou te ouvindo…";
    return "Aguarde…";
  })();

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
      {labelTop && (
        <div className="rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-xl px-3 py-2 max-w-xs">
          <p className={cn("text-xs", partial ? "italic text-foreground" : "text-muted-foreground")}>
            {labelTop}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        disabled={!active}
        aria-label={active ? (listening ? "Parar de ouvir" : "Falar com Spark") : "Spark desativado"}
        title={active
          ? (isProcessing ? "Wizard pensando…" : listening ? "Toque pra parar" : userStopped ? "Toque pra retomar" : "Aguarde…")
          : "Spark desativado (você chegou aqui por texto)"}
        className={cn(
          "relative w-14 h-14 rounded-full grid place-items-center transition-all border-2 backdrop-blur-md shadow-xl",
          !active && "bg-muted/40 border-border opacity-60 cursor-not-allowed grayscale",
          active && !isProcessing && !listening && "bg-primary/20 border-primary/50 hover:scale-105 cursor-pointer",
          active && listening && "bg-primary/40 border-primary scale-110 cursor-pointer",
          active && isProcessing && "bg-amber-500/20 border-amber-500/50",
        )}
      >
        {listening && active && (
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
        )}
        {isProcessing && active ? (
          <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
        ) : active ? (
          <Mic className={cn("w-5 h-5", listening ? "text-primary-foreground" : "text-primary")} />
        ) : (
          <MicOff className="w-5 h-5 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
