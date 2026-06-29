import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, MessageSquare, Settings, X, ArrowUp, RefreshCw, Sparkles, BarChart3, Square } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fnUrl } from "@/lib/supabase-url";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { StarkOrb } from "./StarkOrb";
import { cn } from "@/lib/utils";
import { useStarkLiveKit } from "@/hooks/use-stark-livekit";

/** Feature flag: 'legacy' (MediaRecorder + edge fn) ou 'livekit' (Agent Railway).
 *  Default agora e 'livekit' (streaming sub-segundo, Jarvis mode).
 *  Opt-out via localStorage: setItem('stark_voice_provider', 'legacy') pra
 *  forcar o caminho antigo em caso de bug. */
const VOICE_PROVIDER_KEY = "stark_voice_provider";
type VoiceProvider = "legacy" | "livekit";
function readVoiceProvider(): VoiceProvider {
  if (typeof window === "undefined") return "livekit";
  return localStorage.getItem(VOICE_PROVIDER_KEY) === "legacy" ? "legacy" : "livekit";
}

type Mode = "voice" | "text";
type OrbState = "idle" | "listening" | "recording" | "processing" | "speaking" | "error";

// VAD (voice activity detection) thresholds — tuned for typical desktop/laptop mics.
// Values are normalized 0..1 from analyser.getByteFrequencyData average.
const VAD_SPEECH_THRESHOLD = 0.05;
const VAD_SILENCE_THRESHOLD = 0.03;
const VAD_SILENCE_MS = 1300;     // stop utterance after this much silence
const VAD_MIN_RECORD_MS = 500;   // ignore ultra-short blips
const VAD_MIN_BLOB_BYTES = 1500; // discard near-empty recordings
const INTENSITY_UPDATE_MS = 80;  // throttle React state updates from the rAF loop (~12fps)

interface TranscriptEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const TEXT_SUGGESTIONS = [
  ["Agente SDR para WhatsApp", "Agente de Suporte 24/7", "Dashboard de Vendas"],
  ["Agente de Qualificação", "CRM Completo", "Landing Page"],
  ["Agente BDR LinkedIn", "Portal de Clientes", "Sistema de Tarefas"],
];

interface StarkInterfaceProps {
  greeting: string;
  userName: string;
  honorific: string;
  onTextSubmit: (text: string) => void;
  onVoiceTranscript?: (text: string) => void;
}

export function StarkInterface({ greeting, userName, honorific, onTextSubmit, onVoiceTranscript }: StarkInterfaceProps) {
  const [mode, setMode] = useState<Mode>("voice");
  // Feature flag — legacy (edge fn) vs livekit (Stark Agent no Railway).
  // Voltado pra localStorage, leitura no mount + listener pra sincronizar
  // quando o user troca em Configuracoes > Stark.
  const [voiceProvider, setVoiceProvider] = useState<VoiceProvider>(() => readVoiceProvider());
  useEffect(() => {
    const handler = () => setVoiceProvider(readVoiceProvider());
    window.addEventListener("storage", handler);
    window.addEventListener("stark:voice-provider-changed", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("stark:voice-provider-changed", handler);
    };
  }, []);
  const useLiveKit = voiceProvider === "livekit";
  // 'build' = criacao de agente (stark-voice, fluxo Jarvis com fast-ack + nav)
  // 'manage' = perguntas de gestao (stark-chat com tools, ainda em beta)
  const [purpose, setPurpose] = useState<"build" | "manage">("build");
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [textInput, setTextInput] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [intensity, setIntensity] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const navigate = useNavigate();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const historyRef = useRef<Array<{ role: "user" | "assistant"; content: string }>>([]);

  // Hands-free VAD bookkeeping. Refs (not state) because the rAF loop runs
  // off the render cycle and we don't want to retrigger it every frame.
  const orbStateRef = useRef<OrbState>("idle");
  const isCapturingRef = useRef(false);     // a MediaRecorder is currently running
  const recordingStartRef = useRef(0);      // performance.now() when current utterance started
  const lastSpeechRef = useRef(0);          // performance.now() of last frame above threshold
  useEffect(() => { orbStateRef.current = orbState; }, [orbState]);

  // Keep the latest onVoiceTranscript in a ref so sendAudio can stay stable
  // (otherwise startUtterance, memoized with [], would capture a stale prop).
  const onVoiceTranscriptRef = useRef(onVoiceTranscript);
  useEffect(() => { onVoiceTranscriptRef.current = onVoiceTranscript; }, [onVoiceTranscript]);

  // ── LiveKit (Fase 3) ──
  // Sessao SO inicia quando user toca na esfera (consent explicito).
  // Sem isso, /home auto-abria o microfone e consumia creditos sem
  // o user clicar em nada.
  const [liveKitActive, setLiveKitActive] = useState(false);
  // Resetar quando troca de modo (voice ↔ text) ou desliga LiveKit
  useEffect(() => {
    if (mode !== "voice" || !useLiveKit) setLiveKitActive(false);
  }, [mode, useLiveKit]);
  const livekit = useStarkLiveKit({
    active: useLiveKit && mode === "voice" && liveKitActive,
  });

  // Mapeia state do hook LiveKit pro OrbState legacy (mesma UI pra ambos).
  const liveKitOrbState: OrbState = useMemo(() => {
    switch (livekit.state) {
      case "connecting": return "processing";
      case "listening":  return "listening";
      case "speaking":   return "speaking";
      case "no_credits": return "error";
      case "error":      return "error";
      default:           return "idle";
    }
  }, [livekit.state]);

  const pickMime = () =>
    MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "";

  // Start a fresh utterance recorder on the persistent mic stream.
  const startUtterance = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || isCapturingRef.current) return;
    const mime = pickMime();
    const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    mediaRecorderRef.current = rec;
    chunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
      chunksRef.current = [];
      mediaRecorderRef.current = null;
      isCapturingRef.current = false;
      if (blob.size < VAD_MIN_BLOB_BYTES) {
        // Too short — drop it and return to listening if session is still active.
        if (orbStateRef.current !== "idle" && orbStateRef.current !== "error") {
          setOrbState("listening");
        }
        return;
      }
      await sendAudio(blob);
    };
    rec.start();
    isCapturingRef.current = true;
    recordingStartRef.current = performance.now();
    lastSpeechRef.current = performance.now();
    setOrbState("recording");
  }, []);

  // Finalize the current utterance (VAD-triggered or session end).
  const stopUtterance = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (!rec || !isCapturingRef.current) return;
    try { rec.stop(); } catch { /* noop */ }
  }, []);

  // Libera SO recursos de microfone/analyser. Nao toca no audio TTS — esse
  // pode estar reproduzindo a frase do Stark e precisa continuar mesmo
  // depois que o componente desmonta (caso navegacao Jarvis-style).
  const releaseMicResources = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (isCapturingRef.current && mediaRecorderRef.current) {
      try { mediaRecorderRef.current.stop(); } catch { /* noop */ }
    }
    mediaRecorderRef.current = null;
    isCapturingRef.current = false;
    chunksRef.current = [];
    analyserRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // endSession: usuario CLICA pra parar. Mata tudo incluindo audio.
  const endSession = useCallback(() => {
    releaseMicResources();
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = "";
    }
    setIntensity(0);
    setOrbState("idle");
  }, [releaseMicResources]);

  // Cleanup no UNMOUNT (ex.: navegacao). NAO pausa o audio TTS — usuario
  // ainda precisa ouvir o resto da frase do Stark mesmo na proxima tela.
  // Pra garantir que o browser nao GC o Audio element durante playback,
  // movemos ele pra document.body com auto-remove no onended.
  useEffect(() => () => {
    releaseMicResources();
    const a = audioElRef.current;
    if (!a) return;
    // Mata setState pendentes (componente vai desmontar).
    a.onplay = null;
    if (a.paused) {
      // Nao estava tocando — pode liberar tudo.
      a.onended = null;
      a.onerror = null;
      try { URL.revokeObjectURL(a.src); } catch { /* noop */ }
      return;
    }
    // Estava tocando — anexa no body pra sobreviver ao unmount.
    // onended/onerror limpam sozinhos quando terminar.
    a.onended = () => {
      try { a.remove(); } catch { /* noop */ }
      try { URL.revokeObjectURL(a.src); } catch { /* noop */ }
    };
    a.onerror = () => {
      try { a.remove(); } catch { /* noop */ }
      try { URL.revokeObjectURL(a.src); } catch { /* noop */ }
    };
    try {
      a.style.display = "none";
      document.body.appendChild(a);
    } catch { /* noop */ }
  }, [releaseMicResources]);

  const startSession = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      setOrbState("listening");

      const data = new Uint8Array(analyser.frequencyBinCount);
      let lastIntensityUpdate = 0;
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length / 255;

        const state = orbStateRef.current;
        const now = performance.now();

        // Throttle the React state update — 60fps of setState was making
        // the whole tree re-render every frame, which felt like jank/freeze.
        // Also skip during processing/speaking where the orb relies on CSS
        // animations rather than the intensity-driven scale.
        if ((state === "listening" || state === "recording") && now - lastIntensityUpdate > INTENSITY_UPDATE_MS) {
          setIntensity(avg);
          lastIntensityUpdate = now;
        }

        // Only run VAD while we're free to capture. While processing or
        // speaking we still tick (cheap) but skip start/stop logic to avoid
        // feedback loops from TTS playback.
        if (state === "listening" || state === "recording") {
          if (avg > VAD_SPEECH_THRESHOLD) {
            lastSpeechRef.current = now;
            if (!isCapturingRef.current) startUtterance();
          } else if (isCapturingRef.current && avg < VAD_SILENCE_THRESHOLD) {
            const silenceFor = now - lastSpeechRef.current;
            const recordedFor = now - recordingStartRef.current;
            if (silenceFor > VAD_SILENCE_MS && recordedFor > VAD_MIN_RECORD_MS) {
              stopUtterance();
            }
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (e) {
      console.error("[stark] mic error", e);
      setOrbState("error");
      toast.error("Não foi possível acessar o microfone");
    }
  }, [startUtterance, stopUtterance]);

  const sendAudio = useCallback(async (blob: Blob) => {
    setOrbState("processing");
    try {
      const form = new FormData();
      form.append("audio", blob, "audio.webm");
      form.append("history", JSON.stringify(historyRef.current.slice(-8)));

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setOrbState("error");
        toast.error("Sessão expirada");
        return;
      }

      // Roteamento por purpose:
      //  - 'build'  -> stark-voice (binário + headers; fast-ack + nav)
      //  - 'manage' -> stark-chat  (JSON com tools, audio base64)
      const endpoint = purpose === "manage" ? "stark-chat" : "stark-voice";
      const resp = await fetch(fnUrl(endpoint), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          ...(purpose === "build" ? { Accept: "audio/mpeg" } : {}),
        },
        body: form,
      });
      const contentType = resp.headers.get("content-type") || "";
      const isJsonResp = contentType.includes("application/json");
      const isAudioResp = contentType.includes("audio");

      if (!resp.ok || (!isJsonResp && !isAudioResp)) {
        let parsed: any = null;
        try { parsed = await resp.json(); } catch { /* noop */ }
        const msg = parsed?.message || parsed?.error || `Falha ao processar áudio (HTTP ${resp.status})`;
        console.error("[stark] backend error", { msg, parsed, status: resp.status });
        setOrbState("error");
        toast.error(msg, {
          action: msg.includes("ElevenLabs") || parsed?.error === "elevenlabs_not_configured"
            ? { label: "Configurar", onClick: () => navigate("/settings?tab=integrations") }
            : parsed?.error === "no_llm_configured"
            ? { label: "Configurar LLM", onClick: () => navigate("/settings?tab=providers") }
            : undefined,
        });
        return;
      }

      // ── Extração de transcript/reply/audio nas duas formas ───────────
      let userText = "";
      let reply = "";
      let intent = "chat";
      let audioBlobPromise: Promise<Blob> | null = null;

      if (isAudioResp) {
        // stark-voice: binário + headers base64-UTF8
        const decode = (b64: string) => { try { return decodeURIComponent(escape(atob(b64))); } catch { return ""; } };
        userText = decode(resp.headers.get("x-stark-transcript") || "");
        reply = decode(resp.headers.get("x-stark-reply") || "");
        intent = resp.headers.get("x-stark-intent") || "chat";
        audioBlobPromise = resp.blob();
      } else {
        // stark-chat: JSON com { transcript, reply, audio (base64), tools_called }
        const j = await resp.json();
        userText = j.transcript || "";
        reply = j.reply || "";
        intent = "chat";
        if (j.audio && j.audio_mime) {
          const bytes = Uint8Array.from(atob(j.audio), (c) => c.charCodeAt(0));
          audioBlobPromise = Promise.resolve(new Blob([bytes], { type: j.audio_mime }));
        }
        console.log("[stark-chat] tools:", j.tools_called, "tokens:", j.tokens);
      }
      console.log("[stark] transcript:", userText, "| intent:", intent, "| reply:", reply.slice(0, 60));

      historyRef.current.push({ role: "user", content: userText });
      historyRef.current.push({ role: "assistant", content: reply });

      const ts = Date.now();
      setTranscript((prev) => [
        ...prev,
        { id: `${ts}-u`, role: "user", content: userText },
        { id: `${ts}-a`, role: "assistant", content: reply },
      ]);

      const resumeState = (): OrbState => (streamRef.current ? "listening" : "idle");

      // Backend decidiu se eh creation ou chat. Front confia (evita divergencia
      // entre dois regex). Se creation, dispara navegacao agora — Jarvis-style.
      if (intent === "creation") {
        const cb = onVoiceTranscriptRef.current;
        if (cb) {
          try { cb(userText); } catch (e) { console.error("[stark] onVoiceTranscript falhou:", e); }
        } else {
          console.warn("[stark] intent=creation mas onVoiceTranscript nao registrado");
        }
      }

      // Se nao tem audio (caso raro: stark-chat sem ElevenLabs), volta a ouvir.
      if (!audioBlobPromise) {
        setOrbState(resumeState());
        return;
      }

      // Blob URL toca direto, sem decode base64 extra — corta ~200-400ms.
      const audioBlob = await audioBlobPromise;
      const audioUrl = URL.createObjectURL(audioBlob);
      if (audioElRef.current) {
        try { URL.revokeObjectURL(audioElRef.current.src); } catch { /* noop */ }
      }
      if (!audioElRef.current) audioElRef.current = new Audio();
      audioElRef.current.src = audioUrl;
      audioElRef.current.onplay = () => setOrbState("speaking");
      audioElRef.current.onended = () => setOrbState(resumeState());
      audioElRef.current.onerror = () => setOrbState(resumeState());
      try {
        await audioElRef.current.play();
      } catch {
        setOrbState(resumeState());
      }
    } catch (e) {
      console.error("[stark] sendAudio error", e);
      setOrbState("error");
      toast.error("Erro ao processar áudio");
    }
  }, [navigate]);

  const sessionActive = orbState !== "idle" && orbState !== "error";

  const handleOrbClick = () => {
    // LiveKit: toggle conexao via hook (consent explicito do user).
    if (useLiveKit) {
      setLiveKitActive((prev) => !prev);
      return;
    }
    // Legacy: gerencia sessao MediaRecorder.
    if (sessionActive) {
      endSession();
    } else {
      startSession();
    }
  };

  const handleSwitchToText = () => {
    endSession();
    setMode("text");
  };

  const handleSwitchToVoice = () => {
    setMode("voice");
    setOrbState("idle");
  };

  const submitText = async () => {
    const t = textInput.trim();
    if (!t) return;

    // Modo manage: nao navega — chama stark-chat e mostra resposta inline.
    if (purpose === "manage") {
      setOrbState("processing");
      setTextInput("");
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) { toast.error("Sessão expirada"); setOrbState("idle"); return; }
        const resp = await fetch(fnUrl("stark-chat"), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: t, history: historyRef.current.slice(-8) }),
        });
        if (!resp.ok) {
          const parsed = await resp.json().catch(() => ({}));
          toast.error(parsed?.message || `Falha (HTTP ${resp.status})`, {
            action: parsed?.error === "no_llm_configured"
              ? { label: "Configurar LLM", onClick: () => navigate("/settings?tab=providers") }
              : undefined,
          });
          setOrbState("idle");
          return;
        }
        const j = await resp.json();
        const reply = j.reply || "";
        historyRef.current.push({ role: "user", content: t });
        historyRef.current.push({ role: "assistant", content: reply });
        const ts = Date.now();
        setTranscript((prev) => [
          ...prev,
          { id: `${ts}-u`, role: "user", content: t },
          { id: `${ts}-a`, role: "assistant", content: reply },
        ]);
        setOrbState("idle");
      } catch (e) {
        toast.error(`Erro: ${(e as Error).message}`);
        setOrbState("idle");
      }
      return;
    }

    // Modo build: comportamento antigo — navega via onTextSubmit
    onTextSubmit(t);
  };

  const orbHint = (() => {
    if (useLiveKit) {
      if (!liveKitActive) return "Toque na esfera para iniciar a conversa";
      switch (livekit.state) {
        case "connecting": return "Conectando…";
        case "listening":  return "Pode falar";
        case "speaking":   return "";
        case "no_credits": return livekit.error || "Créditos esgotados";
        case "error":      return livekit.error || "Toque para tentar novamente";
        default:           return "";
      }
    }
    switch (orbState) {
      case "idle": return "Toque na esfera para iniciar a conversa";
      case "listening": return "Pode falar";
      case "recording": return "";
      case "processing": return "";
      case "speaking": return "";
      case "error": return "Toque para tentar novamente";
    }
  })();

  const orbStateForVisual: "idle" | "connecting" | "listening" | "speaking" | "error" = useLiveKit
    ? (
        liveKitOrbState === "recording" || liveKitOrbState === "listening" ? "listening"
        : liveKitOrbState === "processing" ? "connecting"
        : liveKitOrbState === "speaking" ? "speaking"
        : liveKitOrbState === "error" ? "error"
        : "idle"
      )
    : (
        orbState === "recording" || orbState === "listening" ? "listening"
        : orbState === "processing" ? "connecting"
        : orbState === "speaking" ? "speaking"
        : orbState === "error" ? "error"
        : "idle"
      );
  const orbIntensity = useLiveKit ? livekit.intensity : intensity;

  const currentSuggestions = TEXT_SUGGESTIONS[suggestionIndex % TEXT_SUGGESTIONS.length];

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 py-8 relative">
      {/* Top toggles: input mode (voz/texto) + purpose (construtor/gestao) */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {/* Input mode toggle */}
        <div className="flex items-center gap-1 rounded-full border border-border bg-card/50 backdrop-blur-sm p-1">
          <button
            onClick={handleSwitchToVoice}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              mode === "voice" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Mic className="w-3.5 h-3.5" />
            Voz
          </button>
          <button
            onClick={handleSwitchToText}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              mode === "text" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Texto
          </button>
        </div>

        {/* Purpose toggle: build (criar agente) vs manage (perguntar gestao) */}
        <div className="flex items-center gap-1 rounded-full border border-border bg-card/50 backdrop-blur-sm p-1">
          <button
            onClick={() => setPurpose("build")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              purpose === "build" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
            title="Stark cria agentes pra você"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Construir
          </button>
          <button
            onClick={() => setPurpose("manage")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              purpose === "manage" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
            title="Pergunte sobre receita, agentes, métricas..."
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Gestão
          </button>
        </div>
      </div>

      <h1 className="text-3xl lg:text-5xl font-light text-foreground mb-3 text-center">
        {greeting}, {honorific}. <span className="italic">{userName}</span>
      </h1>
      <p className="text-sm lg:text-base text-muted-foreground mb-10 text-center max-w-lg">
        {purpose === "manage"
          ? mode === "voice"
            ? "Pergunte sobre receita, agentes, métricas — Stark consulta seus dados em tempo real."
            : "Digite sua pergunta sobre gestão — receita, métricas, conversas, qualquer dado da sua agência."
          : mode === "voice"
            ? "Fale o que precisa e eu cuido do resto."
            : "Crie Agentes inteligentes e Aplicações para WhatsApp e Web em minutos conversando com a inteligência artificial."}
      </p>

      {mode === "voice" ? (
        <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
          <div className="relative">
            <StarkOrb
              state={orbStateForVisual}
              intensity={orbIntensity}
              onClick={handleOrbClick}
              disabled={useLiveKit ? livekit.state === "connecting" : orbState === "processing"}
            />
          </div>

          <p className="text-sm text-muted-foreground text-center min-h-[1.5rem]">{orbHint}</p>

          {/* Stark controls: stop, mute, mensagens, configurações */}
          <div className="flex items-center gap-2">
            <button
              onClick={endSession}
              disabled={!sessionActive}
              title="Encerrar"
              className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-card/50 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const stream = streamRef.current;
                if (!stream) return;
                const next = !muted;
                stream.getAudioTracks().forEach((t) => { t.enabled = !next; });
                setMuted(next);
              }}
              disabled={!sessionActive}
              title={muted ? "Reativar microfone" : "Mudo"}
              className={cn(
                "relative flex items-center justify-center w-10 h-10 rounded-full border-2 backdrop-blur-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                muted
                  ? "border-destructive bg-destructive/15 text-destructive shadow-[0_0_12px_-4px_hsl(var(--destructive))]"
                  : "border-border bg-card/50 text-muted-foreground hover:text-foreground hover:border-foreground/20",
              )}
            >
              <Mic className={cn("w-4 h-4", muted && "text-destructive")} />
              {muted && (
                <span
                  aria-hidden
                  className="absolute left-1.5 right-1.5 h-[2.5px] rounded-full bg-destructive rotate-45 pointer-events-none"
                />
              )}
            </button>
            <button
              onClick={() => setShowTranscript(true)}
              disabled={transcript.length === 0}
              title="Ver mensagens"
              className="relative flex items-center justify-center w-10 h-10 rounded-full border border-border bg-card/50 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <MessageSquare className="w-4 h-4" />
              {transcript.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium grid place-items-center">
                  {transcript.length}
                </span>
              )}
            </button>
            <Link
              to="/settings?tab=integrations"
              title="Configurações do Stark"
              className="flex items-center justify-center w-10 h-10 rounded-full border border-border bg-card/50 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>

          <Dialog open={showTranscript} onOpenChange={setShowTranscript}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Conversa com Stark</span>
                  {transcript.length > 0 && (
                    <button
                      onClick={() => { setTranscript([]); historyRef.current = []; }}
                      className="text-xs font-normal text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mr-6"
                    >
                      <X className="w-3 h-3" /> Limpar
                    </button>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
                {transcript.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma mensagem ainda.
                  </p>
                ) : (
                  transcript.map((entry) => (
                    <div
                      key={entry.id}
                      className={cn(
                        "text-sm leading-relaxed",
                        entry.role === "user" ? "text-foreground" : "text-muted-foreground italic",
                      )}
                    >
                      <span className="text-[10px] uppercase tracking-wider opacity-50 mr-2">
                        {entry.role === "user" ? "Você" : "Stark"}
                      </span>
                      {entry.content}
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="w-full max-w-2xl">
          <div className="rounded-2xl border border-border bg-card shadow-xl shadow-black/5 overflow-hidden mb-6">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={purpose === "manage"
                ? "Quantas qualificações o SDR fez hoje? Qual a receita do mês?"
                : "Descreva o agente ou app que você quer criar..."}
              className="w-full bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground/50 px-5 py-4 min-h-[100px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitText();
                }
              }}
            />
            <div className="flex items-center justify-end px-4 pb-3">
              <Button
                size="sm"
                className="h-9 px-5 rounded-full gap-1.5"
                disabled={!textInput.trim()}
                onClick={submitText}
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center">
            {currentSuggestions.map((label) => (
              <button
                key={label}
                onClick={() => setTextInput(label)}
                className="px-4 py-2 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setSuggestionIndex((i) => i + 1)}
              className="flex items-center justify-center w-9 h-9 rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
