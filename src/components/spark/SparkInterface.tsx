import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MessageSquare, Loader2, Settings, X, ArrowUp, RefreshCw, Square } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SparkOrb } from "./SparkOrb";
import { cn } from "@/lib/utils";

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

interface SparkInterfaceProps {
  greeting: string;
  userName: string;
  honorific: string;
  onTextSubmit: (text: string) => void;
  onVoiceTranscript?: (text: string) => void;
}

export function SparkInterface({ greeting, userName, honorific, onTextSubmit, onVoiceTranscript }: SparkInterfaceProps) {
  const [mode, setMode] = useState<Mode>("voice");
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [textInput, setTextInput] = useState("");
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [intensity, setIntensity] = useState(0);
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

  const endSession = useCallback(() => {
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
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.src = "";
    }
    setIntensity(0);
    setOrbState("idle");
  }, []);

  useEffect(() => () => { endSession(); }, [endSession]);

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
      console.error("[spark] mic error", e);
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

      const { data, error } = await supabase.functions.invoke("spark-voice", { body: form });
      if (error || !data || (data as any).error) {
        // supabase-js FunctionsHttpError exposes the Response on `context`.
        // We have to await .json()/.text() to read the body — that's where
        // spark-voice puts { error, message, details }.
        let parsed: any = null;
        const ctx = (error as any)?.context;
        if (ctx && typeof ctx.clone === "function") {
          try {
            parsed = await ctx.clone().json();
          } catch {
            try { parsed = { message: await ctx.clone().text() }; } catch { /* noop */ }
          }
        }

        const dataAny = data as any;
        const msg =
          parsed?.message ||
          parsed?.error ||
          parsed?.details ||
          dataAny?.message ||
          dataAny?.error ||
          (error as Error | undefined)?.message ||
          "Falha ao processar áudio";

        console.error("[spark] backend error", { msg, parsed, data, error });
        setOrbState("error");
        toast.error(msg, {
          action: msg.includes("ElevenLabs") || parsed?.error === "elevenlabs_not_configured"
            ? { label: "Configurar", onClick: () => navigate("/settings?tab=integrations") }
            : undefined,
        });
        return;
      }

      const { transcript: userText, reply, audio, audio_mime } = data as {
        transcript: string;
        reply: string;
        audio: string;
        audio_mime: string;
      };

      historyRef.current.push({ role: "user", content: userText });
      historyRef.current.push({ role: "assistant", content: reply });

      const ts = Date.now();
      setTranscript((prev) => [
        ...prev,
        { id: `${ts}-u`, role: "user", content: userText },
        { id: `${ts}-a`, role: "assistant", content: reply },
      ]);

      // Play TTS, then forward the user's transcript to the host so it can route
      // the same way the text mode does (e.g. open the builder).
      const dispatchTranscript = () => {
        const cb = onVoiceTranscriptRef.current;
        if (!cb) return;
        try { cb(userText); } catch { /* noop */ }
      };

      // After TTS finishes, if the session is still alive we resume listening
      // (hands-free). If endSession ran in between (stream cleared), stay idle.
      const resumeState = (): OrbState => (streamRef.current ? "listening" : "idle");

      const src = `data:${audio_mime};base64,${audio}`;
      if (!audioElRef.current) audioElRef.current = new Audio();
      audioElRef.current.src = src;
      audioElRef.current.onplay = () => setOrbState("speaking");
      audioElRef.current.onended = () => { setOrbState(resumeState()); dispatchTranscript(); };
      audioElRef.current.onerror = () => { setOrbState(resumeState()); dispatchTranscript(); };
      try {
        await audioElRef.current.play();
      } catch {
        setOrbState(resumeState());
        dispatchTranscript();
      }
    } catch (e) {
      console.error("[spark] sendAudio error", e);
      setOrbState("error");
      toast.error("Erro ao processar áudio");
    }
  }, [navigate]);

  const sessionActive = orbState !== "idle" && orbState !== "error";

  const handleOrbClick = () => {
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

  const submitText = () => {
    const t = textInput.trim();
    if (!t) return;
    onTextSubmit(t);
  };

  const orbHint = (() => {
    switch (orbState) {
      case "idle": return "Toque na esfera para iniciar a conversa";
      case "listening": return "Pode falar — toque para encerrar";
      case "recording": return "Capturando… solte uma pausa quando terminar";
      case "processing": return "Pensando…";
      case "speaking": return "Spark falando…";
      case "error": return "Toque para tentar novamente";
    }
  })();

  const orbStateForVisual: "idle" | "connecting" | "listening" | "speaking" | "error" =
    orbState === "recording" || orbState === "listening" ? "listening"
    : orbState === "processing" ? "connecting"
    : orbState === "speaking" ? "speaking"
    : orbState === "error" ? "error"
    : "idle";

  const currentSuggestions = TEXT_SUGGESTIONS[suggestionIndex % TEXT_SUGGESTIONS.length];

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 py-8 relative">
      {/* Mode toggle */}
      <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full border border-border bg-card/50 backdrop-blur-sm p-1">
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

      <h1 className="text-3xl lg:text-5xl font-light text-foreground mb-3 text-center">
        {greeting}, {honorific}. <span className="italic">{userName}</span>
      </h1>
      <p className="text-sm lg:text-base text-muted-foreground mb-10 text-center max-w-lg">
        {mode === "voice"
          ? "Spark, seu copiloto de voz. Fale o que precisa — eu cuido do resto."
          : "Crie Agentes inteligentes e Aplicações para WhatsApp e Web em minutos conversando com a inteligência artificial."}
      </p>

      {mode === "voice" ? (
        <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
          <div className="relative">
            <SparkOrb
              state={orbStateForVisual}
              intensity={intensity}
              onClick={handleOrbClick}
              disabled={orbState === "processing"}
            />
            {orbState === "processing" && (
              <Loader2 className="absolute inset-0 m-auto w-6 h-6 text-primary animate-spin pointer-events-none" />
            )}
            {sessionActive && orbState !== "processing" && (
              <Square className="absolute inset-0 m-auto w-4 h-4 text-primary-foreground/80 fill-current pointer-events-none" />
            )}
          </div>

          <p className="text-sm text-muted-foreground text-center min-h-[1.5rem]">{orbHint}</p>

          {transcript.length > 0 && (
            <div className="w-full max-h-64 overflow-y-auto rounded-2xl border border-border bg-card/40 backdrop-blur-sm px-4 py-3 space-y-2">
              {transcript.slice(-8).map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "text-sm leading-relaxed",
                    entry.role === "user" ? "text-foreground" : "text-muted-foreground italic",
                  )}
                >
                  <span className="text-[10px] uppercase tracking-wider opacity-50 mr-2">
                    {entry.role === "user" ? "Você" : "Spark"}
                  </span>
                  {entry.content}
                </div>
              ))}
            </div>
          )}

          {transcript.length > 0 && (
            <button
              onClick={() => { setTranscript([]); historyRef.current = []; }}
              className="text-xs text-muted-foreground/70 hover:text-foreground inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Limpar conversa
            </button>
          )}

          <Link
            to="/settings?tab=integrations"
            className="text-[11px] text-muted-foreground/70 hover:text-foreground inline-flex items-center gap-1"
          >
            <Settings className="w-3 h-3" /> Configurar voz do Spark
          </Link>
        </div>
      ) : (
        <div className="w-full max-w-2xl">
          <div className="rounded-2xl border border-border bg-card shadow-xl shadow-black/5 overflow-hidden mb-6">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Descreva o agente ou app que você quer criar..."
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
