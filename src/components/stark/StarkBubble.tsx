import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { fnUrl } from "@/lib/supabase-url";

interface StarkBubbleProps {
  /** Modo de chegada:
   *  - "voice": bubble ATIVO HANDS-FREE — Stark lê resposta do wizard via
   *    ElevenLabs (mesma voz da Stark), escuta o user, manda pro wizard.
   *  - "text":  bubble visivel mas DESATIVADO — so sinal de presenca. */
  mode: "voice" | "text";
  /** Wizard esta processando a mensagem anterior. */
  isProcessing?: boolean;
  /** Ultima mensagem do agente no chat. Quando muda, Stark le em voz alta. */
  latestAgentMessage?: string | null;
  /** Bubble entrega fala capturada pra parent (forwarda pro wizard.sendMessage). */
  onTranscript?: (text: string) => void;
}

// Espera Stark do home terminar o TTS antes de mexer (~10s + folga).
const INITIAL_TTS_GUARD_MS = 12_000;
// Delay curto entre Stark terminar de falar e religar mic. Generoso
// pra TTS dar tempo de comecar (fetch + decode + play start ~400-800ms).
const RESUME_DELAY_MS = 800;

/** Limpa markdown, emoji, bullet, etc. pro TTS soar natural. */
function cleanForTts(text: string): string {
  return text
    .replace(/[*_`#]/g, "")
    .replace(/^[\s•\-\*]+/gm, "")
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

export function StarkBubble({ mode, isProcessing, latestAgentMessage, onTranscript }: StarkBubbleProps) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [partial, setPartial] = useState("");
  const [userStopped, setUserStopped] = useState(false);
  // Preferencias salvas em Settings > Stark. Default: Sarah, 0.5, 1.0.
  const starkPrefsRef = useRef<{ voiceId?: string; stability?: number; speed?: number }>({});

  // Carrega preferencias do user (uma vez por sessao do bubble)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data } = await supabase
          .from("user_api_keys")
          .select("provider, api_key")
          .eq("user_id", user.id)
          .in("provider", [
            "stark_voice_id", "stark_voice_stability", "stark_voice_speed",
            "spark_voice_id", "spark_voice_stability", "spark_voice_speed",
          ]);
        if (cancelled) return;
        const map = new Map<string, string>();
        (data ?? []).forEach((row: any) => map.set(row.provider, row.api_key ?? ""));
        // Cascade: stark_* (novo) -> spark_* (legacy pre-rename)
        const pick = (k: "voice_id" | "voice_stability" | "voice_speed") =>
          map.get(`stark_${k}`) || map.get(`spark_${k}`) || "";
        const stab = parseFloat(pick("voice_stability"));
        const spd = parseFloat(pick("voice_speed"));
        starkPrefsRef.current = {
          voiceId: pick("voice_id") || undefined,
          stability: Number.isFinite(stab) ? stab : undefined,
          speed: Number.isFinite(spd) ? spd : undefined,
        };
      } catch { /* default config eh suficiente */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const recognitionRef = useRef<any>(null);
  const finalTextRef = useRef("");
  const onTranscriptRef = useRef(onTranscript);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  // initSeen: trava UMA vez quando o bubble ve a primeira mensagem do
  // wizard. Essa primeira mensagem eh o GREETING que o Stark do home ja
  // leu em voz alta — bubble NAO pode repetir.
  const initSeenRef = useRef(false);
  // Ultima string ja falada pelo bubble (evita falar a mesma resposta 2x
  // durante streaming).
  const spokenMessageRef = useRef<string>("");
  const ranInitialGuardRef = useRef(false);
  // Mirror SINCRONO do estado 'speaking'. Necessario porque o setTimeout
  // do auto-listen captura o valor de 'speaking' no momento que foi
  // agendado; setState eh async e pode nao ter propagado ainda quando
  // o auto-listen calcula. A ref atualiza imediato e a callback do
  // timeout checa ela antes de start listening — evita mic capturar
  // o proprio TTS do Stark (feedback loop).
  const speakingRef = useRef(false);

  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  const active = mode === "voice";

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      // abort() em vez de stop() — descarta audio capturado em-vôo e nao
      // dispara onend com transcript final. Critico quando estamos parando
      // pra falar: senao recognition pode entregar trecho com TTS dentro.
      try { recognitionRef.current.abort(); } catch { /* noop */ }
      try { recognitionRef.current.stop(); } catch { /* noop */ }
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.warn("[stark-bubble] SpeechRecognition nao suportado neste browser");
      return;
    }

    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    finalTextRef.current = "";

    rec.onresult = (event: any) => {
      // Safety: se Stark comecou a falar entre o start desta sessao e
      // este evento, descarta tudo — esta capturando o proprio TTS.
      if (speakingRef.current) {
        finalTextRef.current = "";
        setPartial("");
        return;
      }
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
      console.warn("[stark-bubble] recognition error:", e?.error);
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
      // Safety final: se Stark estava falando OU comecou a falar durante a
      // captura, descarta. Evita transcript do TTS chegar no wizard.
      if (speakingRef.current) {
        console.log("[stark-bubble] descartando transcript — speaking ativo");
        return;
      }
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
      console.warn("[stark-bubble] start falhou:", e);
    }
  }, []);

  /** TTS via browser-tts (ElevenLabs) — voz consistente com o Stark do home. */
  const speakMessage = useCallback(async (text: string) => {
    const clean = cleanForTts(text);
    if (!clean) return;

    // Cancela TTS anterior se houver
    if (ttsAudioRef.current) {
      try { ttsAudioRef.current.pause(); } catch { /* noop */ }
      ttsAudioRef.current = null;
    }

    // CRITICO: ref antes do setState. setSpeaking eh assincrono — entre
    // ele e o setTimeout do auto-listen, mic poderia ligar e capturar o
    // proprio TTS quando comecasse a tocar.
    speakingRef.current = true;
    setSpeaking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        speakingRef.current = false;
        setSpeaking(false);
        return;
      }
      const prefs = starkPrefsRef.current;
      const resp = await fetch(fnUrl("browser-tts"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          text: clean,
          voiceId: prefs.voiceId,
          stability: prefs.stability,
          speed: prefs.speed,
        }),
      });
      const ct = resp.headers.get("content-type") || "";
      if (!resp.ok || !ct.includes("audio")) {
        console.warn("[stark-bubble] browser-tts falhou:", resp.status);
        speakingRef.current = false;
        setSpeaking(false);
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (ttsAudioRef.current === audio) ttsAudioRef.current = null;
        speakingRef.current = false;
        setSpeaking(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (ttsAudioRef.current === audio) ttsAudioRef.current = null;
        speakingRef.current = false;
        setSpeaking(false);
      };
      await audio.play().catch(() => {
        URL.revokeObjectURL(url);
        speakingRef.current = false;
        setSpeaking(false);
      });
    } catch (e) {
      console.warn("[stark-bubble] speakMessage exception:", e);
      speakingRef.current = false;
      setSpeaking(false);
    }
  }, []);

  // Quando o wizard adiciona uma mensagem nova, Stark le em voz alta.
  // CUIDADO: a PRIMEIRA mensagem que o bubble ve eh o greeting inicial
  // (3 perguntas do Jarvis) que o Stark do HOME ja leu via ElevenLabs.
  // Bubble NAO pode repetir — usa initSeenRef pra marcar isso como
  // "ja foi falado" sem chamar speakMessage.
  useEffect(() => {
    if (!active) return;
    if (!latestAgentMessage) return;
    if (isProcessing) return; // streaming, espera completar

    // Primeira mensagem que vemos = greeting inicial. Marca como ja-falada.
    if (!initSeenRef.current) {
      initSeenRef.current = true;
      spokenMessageRef.current = latestAgentMessage;
      return;
    }

    if (latestAgentMessage === spokenMessageRef.current) return;

    spokenMessageRef.current = latestAgentMessage;
    if (recognitionRef.current) stopListening();
    void speakMessage(latestAgentMessage);
  }, [latestAgentMessage, isProcessing, active, speakMessage, stopListening]);

  // Auto-listen hands-free. Dispara quando bubble deveria ouvir mas nao esta.
  useEffect(() => {
    if (!active) return;
    if (listening) return;
    if (isProcessing) return;
    if (speaking) return;
    if (userStopped) return;

    const delay = ranInitialGuardRef.current ? RESUME_DELAY_MS : INITIAL_TTS_GUARD_MS;
    const t = window.setTimeout(() => {
      ranInitialGuardRef.current = true;
      // Refs aqui em vez de state: speaking pode ter virado true entre o
      // schedule e o fire deste timeout (TTS comecou). Refs sao sincronas.
      if (!recognitionRef.current && !isProcessing && !speakingRef.current && !userStopped) {
        startListening();
      }
    }, delay);
    return () => window.clearTimeout(t);
  }, [active, listening, isProcessing, speaking, userStopped, startListening]);

  // Cleanup no unmount
  useEffect(() => () => {
    stopListening();
    if (ttsAudioRef.current) {
      try { ttsAudioRef.current.pause(); } catch { /* noop */ }
      ttsAudioRef.current = null;
    }
  }, [stopListening]);

  const handleClick = () => {
    if (!active) return;
    if (speaking) {
      if (ttsAudioRef.current) {
        try { ttsAudioRef.current.pause(); } catch { /* noop */ }
        ttsAudioRef.current = null;
      }
      speakingRef.current = false;
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
    if (speaking) return "Stark está falando…";
    if (isProcessing) return "Stark trabalhando…";
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
          ? (speaking ? "Pular fala do Stark" : listening ? "Parar de ouvir" : "Falar com Stark")
          : "Stark desativado"}
        title={active
          ? (speaking ? "Toque pra pular" : isProcessing ? "Stark trabalhando…" : listening ? "Toque pra parar" : userStopped ? "Toque pra retomar" : "Aguarde…")
          : "Stark desativado (você chegou aqui por texto)"}
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
