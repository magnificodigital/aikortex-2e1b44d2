import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SparkBubbleProps {
  /** Modo de chegada:
   *  - "voice": bubble ATIVO HANDS-FREE — Spark lê resposta do wizard em
   *    voz alta, escuta o user, manda pro wizard, ciclo continuo.
   *  - "text":  bubble visivel mas DESATIVADO — so sinal de presenca. */
  mode: "voice" | "text";
  /** Wizard esta processando a mensagem anterior. */
  isProcessing?: boolean;
  /** Ultima mensagem do agente no chat. Quando muda, Spark le em voz alta
   *  e depois retoma a escuta. */
  latestAgentMessage?: string | null;
  /** Bubble entrega fala capturada pra parent (AgentDetail forwarda
   *  pro wizardChat.sendMessage). */
  onTranscript?: (text: string) => void;
}

// Espera Spark do home terminar o TTS antes de mexer (~10s + folga).
const INITIAL_TTS_GUARD_MS = 12_000;
// Delay curto entre Spark terminar de falar e religar mic.
const RESUME_DELAY_MS = 400;

/** Limpa markdown, emoji, bullet, etc. pro TTS soar natural. */
function cleanForTts(text: string): string {
  return text
    .replace(/[*_`#]/g, "")           // markdown chars
    .replace(/^[\s•\-\*]+/gm, "")     // bullets
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "") // emojis comuns
    .replace(/[\u{2600}-\u{27BF}]/gu, "")   // smileys e simbolos
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

export function SparkBubble({ mode, isProcessing, latestAgentMessage, onTranscript }: SparkBubbleProps) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [partial, setPartial] = useState("");
  const [userStopped, setUserStopped] = useState(false);

  const recognitionRef = useRef<any>(null);
  const finalTextRef = useRef("");
  const onTranscriptRef = useRef(onTranscript);
  const spokenMessageRef = useRef<string>("");
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

  /** TTS local via Web Speech API (gratis, voz PT-BR nativa do SO). */
  const speakMessage = useCallback((text: string) => {
    try { window.speechSynthesis.cancel(); } catch { /* noop */ }
    const clean = cleanForTts(text);
    if (!clean) return;

    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = "pt-BR";
    utter.rate = 1.05;
    utter.pitch = 1.0;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);

    try { window.speechSynthesis.speak(utter); } catch { setSpeaking(false); }
  }, []);

  // Inicializa spokenMessageRef com a mensagem que ja esta na tela quando o
  // bubble monta. O greeting inicial (3 perguntas) ja foi falado pelo Spark
  // do home — bubble NAO repete isso. So fala mensagens NOVAS do wizard.
  useEffect(() => {
    if (latestAgentMessage) {
      spokenMessageRef.current = latestAgentMessage;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quando wizard adiciona uma resposta nova, Spark fala em voz alta.
  // So roda em modo voz, quando nao esta streaming, e quando a mensagem
  // mudou em relacao a ultima ja falada.
  useEffect(() => {
    if (!active) return;
    if (!latestAgentMessage) return;
    if (latestAgentMessage === spokenMessageRef.current) return;
    if (isProcessing) return; // wizard ainda streaming, espera completar
    spokenMessageRef.current = latestAgentMessage;
    // Para de ouvir antes de falar pra nao capturar o proprio TTS.
    if (recognitionRef.current) stopListening();
    speakMessage(latestAgentMessage);
  }, [latestAgentMessage, isProcessing, active, speakMessage, stopListening]);

  // Auto-listen hands-free. Dispara quando bubble deveria estar ouvindo mas
  // nao esta — ou seja:
  //  - voice mode E nao listening E nao processing E nao speaking E nao userStopped
  // Delay maior na primeira vez (espera Spark do home falar) e curto depois.
  useEffect(() => {
    if (!active) return;
    if (listening) return;
    if (isProcessing) return;
    if (speaking) return;
    if (userStopped) return;

    const delay = ranInitialGuardRef.current ? RESUME_DELAY_MS : INITIAL_TTS_GUARD_MS;
    const t = window.setTimeout(() => {
      ranInitialGuardRef.current = true;
      if (!recognitionRef.current && !isProcessing && !speaking && !userStopped) {
        startListening();
      }
    }, delay);
    return () => window.clearTimeout(t);
  }, [active, listening, isProcessing, speaking, userStopped, startListening]);

  // Cleanup no unmount: para mic E TTS
  useEffect(() => () => {
    stopListening();
    try { window.speechSynthesis.cancel(); } catch { /* noop */ }
  }, [stopListening]);

  const handleClick = () => {
    if (!active) return;
    if (speaking) {
      // Skip da fala atual
      try { window.speechSynthesis.cancel(); } catch { /* noop */ }
      setSpeaking(false);
      return;
    }
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
    if (speaking) return "Spark está falando…";
    if (isProcessing) return "Wizard está pensando…";
    if (userStopped && !listening) return "Toque pra retomar";
    if (listening) return partial || "Estou te ouvindo…";
    return "Aguarde…";
  })();

  const buttonIcon = (() => {
    if (!active) return <MicOff className="w-5 h-5 text-muted-foreground" />;
    if (speaking) return <Volume2 className="w-5 h-5 text-primary-foreground" />;
    if (isProcessing) return <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />;
    return <Mic className={cn("w-5 h-5", listening ? "text-primary-foreground" : "text-primary")} />;
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
        aria-label={active
          ? (speaking ? "Pular fala do Spark" : listening ? "Parar de ouvir" : "Falar com Spark")
          : "Spark desativado"}
        title={active
          ? (speaking ? "Toque pra pular" : isProcessing ? "Wizard pensando…" : listening ? "Toque pra parar" : userStopped ? "Toque pra retomar" : "Aguarde…")
          : "Spark desativado (você chegou aqui por texto)"}
        className={cn(
          "relative w-14 h-14 rounded-full grid place-items-center transition-all border-2 backdrop-blur-md shadow-xl",
          !active && "bg-muted/40 border-border opacity-60 cursor-not-allowed grayscale",
          active && !isProcessing && !listening && !speaking && "bg-primary/20 border-primary/50 hover:scale-105 cursor-pointer",
          active && listening && "bg-primary/40 border-primary scale-110 cursor-pointer",
          active && speaking && "bg-primary/40 border-primary scale-110 cursor-pointer",
          active && isProcessing && "bg-amber-500/20 border-amber-500/50",
        )}
      >
        {(listening || speaking) && active && (
          <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
        )}
        {buttonIcon}
      </button>
    </div>
  );
}
