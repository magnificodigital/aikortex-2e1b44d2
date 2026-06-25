import { useState, useEffect, useCallback, useRef } from "react";
import { useConversation } from "@elevenlabs/react";
import {
  Phone, PhoneOff, Mic, MicOff, FileText, AlertTriangle, ExternalLink, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel" },
];

type CallStatus = "idle" | "connecting" | "connected" | "ended";

// Ambient backgrounds: arquivos .mp3 hospedados em Supabase Storage (bucket
// público voice-ambience) — fica tudo na infra da própria agência, sem
// dependência do Lovable Assets storage.
//
// Pra trocar/atualizar áudios: Supabase Dashboard → Storage → voice-ambience.
// Permissões: só platform_owner/platform_admin podem subir (RLS).
const STORAGE_BASE = "https://jcahtniqqiaefszhgpqx.supabase.co/storage/v1/object/public/voice-ambience";
const BG_SOUNDS: Array<{ id: string; label: string; url?: string }> = [
  { id: "none", label: "Silêncio" },
  { id: "nature", label: "Natureza", url: `${STORAGE_BASE}/nature.mp3` },
  { id: "callcenter", label: "Call center", url: `${STORAGE_BASE}/callcenter.mp3` },
  { id: "cafe", label: "Café", url: `${STORAGE_BASE}/cafe.mp3` },
];

// Palavras-chave que disparam encerramento client-side (fallback caso o
// end_call_phrases server-side não dispare). Match em transcript do user.
const END_CALL_KEYWORDS = [
  // Variações principais
  "tchau", "tchaau", "txau", "xau",
  "ate logo", "até logo", "ate mais", "até mais",
  "ate breve", "até breve", "ate a proxima", "até a próxima",
  // Encerramento explícito
  "desligar", "vou desligar", "pode desligar", "desliga", "desligo",
  "encerrar", "encerra a ligacao", "encerra a ligação",
  // Despedidas com agradecimento
  "valeu", "valeu tchau", "valeu, tchau",
  "obrigado tchau", "obrigada tchau",
  "muito obrigado", "muito obrigada",
  // Despedidas formais
  "adeus", "ciao",
  // Inglês comum (caso transcrição venha em EN)
  "bye", "goodbye", "good bye",
];

/** Normaliza texto: lowercase, remove acentos, pontuação e espaços extras
 * pra match mais robusto contra END_CALL_KEYWORDS. "Tchau!" vira "tchau". */
function normalizeForKeyword(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[^a-z0-9\s]/g, " ")    // remove pontuação
    .replace(/\s+/g, " ")
    .trim();
}

interface VoiceCallPanelProps {
  agentName: string;
  agentAvatar: string;
  agentPrompt?: string;
  agentGreeting?: string;
  hasElevenLabsKey: boolean;
  onGoToIntegrations: () => void;
  /** Voz pré-configurada do agente (config.voiceConfig.voiceId). Quando
   * presente, o teste já usa essa voz e o seletor fica oculto — UX limpa,
   * sem precisar escolher de novo. User pode trocar via "Trocar voz". */
  defaultVoiceId?: string;
  /** ID do agente sendo testado. Usado pra persistir a call em call_logs
   * (junto com transcript + duration) e aparecer em /calls. */
  agentId?: string;
}

/* ── Animated Orb ── */
const VoiceOrb = ({ isSpeaking, isConnected, avatarUrl }: { isSpeaking: boolean; isConnected: boolean; avatarUrl?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const phaseRef = useRef(0);
  const intensityRef = useRef(0);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!avatarUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = avatarUrl;
    img.onload = () => { imgRef.current = img; };
  }, [avatarUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const size = 280;
    canvas.width = size * 2;
    canvas.height = size * 2;
    ctx.scale(2, 2);

    // Read the --primary CSS variable (HSL values) from :root
    const rootStyles = getComputedStyle(document.documentElement);
    const primaryHSL = rootStyles.getPropertyValue("--primary").trim(); // e.g. "221 83% 53%"
    const makeColor = (alpha: number) => `hsla(${primaryHSL} / ${alpha})`;

    const center = size / 2;
    const baseRadius = 70;

    const draw = () => {
      phaseRef.current += 0.02;
      const targetIntensity = isSpeaking ? 1 : isConnected ? 0.3 : 0;
      intensityRef.current += (targetIntensity - intensityRef.current) * 0.08;
      const intensity = intensityRef.current;

      ctx.clearRect(0, 0, size, size);

      // Outer glow layers
      for (let i = 3; i >= 0; i--) {
        const glowRadius = baseRadius + 20 + i * 15 + intensity * 12 * Math.sin(phaseRef.current * (1.2 + i * 0.3));
        const alpha = (0.03 + intensity * 0.04) * (1 - i * 0.2);
        const gradient = ctx.createRadialGradient(center, center, 0, center, center, glowRadius);
        gradient.addColorStop(0, makeColor(alpha));
        gradient.addColorStop(0.6, makeColor(alpha * 0.5));
        gradient.addColorStop(1, makeColor(0));
        ctx.beginPath();
        ctx.arc(center, center, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Main orb with organic deformation
      const points = 120;
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const wave1 = Math.sin(angle * 3 + phaseRef.current * 2) * intensity * 8;
        const wave2 = Math.sin(angle * 5 - phaseRef.current * 1.5) * intensity * 5;
        const wave3 = Math.sin(angle * 7 + phaseRef.current * 3) * intensity * 3;
        const breathe = Math.sin(phaseRef.current * 0.8) * 3;
        const r = baseRadius + wave1 + wave2 + wave3 + breathe;
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const mainGradient = ctx.createRadialGradient(
        center - 15, center - 15, 0,
        center, center, baseRadius + 15
      );
      mainGradient.addColorStop(0, makeColor(0.25 + intensity * 0.15));
      mainGradient.addColorStop(0.5, makeColor(0.15 + intensity * 0.1));
      mainGradient.addColorStop(1, makeColor(0.05 + intensity * 0.05));
      ctx.fillStyle = mainGradient;
      ctx.fill();

      // Inner bright core
      const coreGradient = ctx.createRadialGradient(center, center, 0, center, center, 30 + intensity * 10);
      coreGradient.addColorStop(0, makeColor(0.3 + intensity * 0.2));
      coreGradient.addColorStop(1, makeColor(0));
      ctx.beginPath();
      ctx.arc(center, center, 30 + intensity * 10, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();

      // Agent avatar in center
      if (imgRef.current) {
        const imgRadius = baseRadius;
        ctx.save();
        ctx.beginPath();
        ctx.arc(center, center, imgRadius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(imgRef.current, center - imgRadius, center - imgRadius, imgRadius * 2, imgRadius * 2);
        ctx.restore();
      }

      // Orbiting particles when speaking
      if (intensity > 0.2) {
        for (let i = 0; i < 6; i++) {
          const pAngle = phaseRef.current * (0.8 + i * 0.15) + (i * Math.PI * 2) / 6;
          const pDist = baseRadius + 25 + Math.sin(phaseRef.current * 2 + i) * 10;
          const px = center + pDist * Math.cos(pAngle);
          const py = center + pDist * Math.sin(pAngle);
          const pSize = 2 + intensity * 2;
          const pAlpha = intensity * 0.4;
          ctx.beginPath();
          ctx.arc(px, py, pSize, 0, Math.PI * 2);
          ctx.fillStyle = makeColor(pAlpha);
          ctx.fill();
        }
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [isSpeaking, isConnected, avatarUrl]);

  return (
    <canvas
      ref={canvasRef}
      className="w-[280px] h-[280px]"
      style={{ imageRendering: "auto" }}
    />
  );
};

const VoiceCallPanel = ({
  agentName,
  agentAvatar,
  agentPrompt,
  agentGreeting,
  hasElevenLabsKey,
  onGoToIntegrations,
  defaultVoiceId,
  agentId,
}: VoiceCallPanelProps) => {
  // Usa voz pré-configurada do agente quando disponível, fallback pro primeiro
  // item de VOICES. User pode revelar/trocar via botão "Trocar voz".
  const [selectedVoice, setSelectedVoice] = useState(defaultVoiceId || VOICES[0].id);
  const [voiceSelectorOpen, setVoiceSelectorOpen] = useState(false);
  const hasPresetVoice = !!defaultVoiceId;
  // Som de fundo da chamada — silêncio por default; user pode escolher
  // ambient (escritório, call center, café) pra dar feel de chamada real.
  const [bgSound, setBgSound] = useState<string>("none");
  const bgAudioCtxRef = useRef<AudioContext | null>(null);
  const bgNoiseSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // bg sound: usa HTML5 Audio() apontando pra arquivo .mp3 local em
  // public/sounds/. Loopa infinitamente em volume 15%. Se 404, mostra
  // toast suave e não trava a call.
  const bgAudioElRef = useRef<HTMLAudioElement | null>(null);

  const startBgSound = useCallback((soundId: string) => {
    const cfg = BG_SOUNDS.find(b => b.id === soundId);
    if (!cfg || !cfg.url) return;
    try {
      const audio = new Audio(cfg.url);
      audio.loop = true;
      audio.volume = 0.18;
      audio.play().then(() => {
        console.log(`[voice-call] bg sound iniciado: ${soundId} (${cfg.url})`);
      }).catch((err) => {
        console.warn(`[voice-call] bg sound falhou (${cfg.url}):`, err);
        toast.info(`Som "${cfg.label}" indisponível — verifique se ${cfg.url} existe em public/`);
      });
      bgAudioElRef.current = audio;
    } catch (e) {
      console.warn("[voice-call] bg sound exception:", e);
    }
  }, []);

  const stopBgSound = useCallback(() => {
    if (bgAudioElRef.current) {
      bgAudioElRef.current.pause();
      bgAudioElRef.current.src = "";
      bgAudioElRef.current = null;
    }
  }, []);

  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState<Array<{ role: string; text: string }>>([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef<number>(0);
  // Refs pra persistir call_log no onDisconnect sem dependências staleadas
  const transcriptRef = useRef<Array<{ role: string; text: string }>>([]);
  const callLogPersistedRef = useRef<boolean>(false);

  /** Salva call_log em /calls com transcript + duração. Chamado ao final
   * da call (onDisconnect ou onError). Idempotente via callLogPersistedRef
   * pra não duplicar se ambos eventos firarem. */
  const persistCallLog = useCallback(async (status: "completed" | "failed") => {
    if (callLogPersistedRef.current) return;
    callLogPersistedRef.current = true;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const durationSec = startTimeRef.current > 0
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : 0;
      // Transcript salvo no formato esperado por CallLogs.tsx drawer
      // (entry.content || entry.text). Usamos { role, content } pra
      // compatibilidade.
      const transcriptForDb = transcriptRef.current.map(t => ({
        role: t.role,
        content: t.text,
        text: t.text, // ambos campos pra cobrir consumers diferentes
      }));
      const { error } = await supabase.from("call_logs").insert({
        user_id: user.id,
        agent_id: agentId || null,
        direction: "outbound", // teste de ligação no browser é sempre saída do user
        channel: "browser",
        duration_seconds: durationSec,
        status,
        transcript: transcriptForDb,
        ended_at: new Date().toISOString(),
      });
      if (error) {
        console.warn("[voice-call] falha ao salvar call_log:", error.message);
      } else {
        console.log(`[voice-call] call_log salvo (status=${status}, dur=${durationSec}s, ${transcriptForDb.length} msgs)`);
      }
    } catch (e) {
      console.warn("[voice-call] persist exception:", e);
    }
  }, [agentId]);

  const conversation = useConversation({
    onConnect: () => {
      setCallStatus("connected");
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      // Inicia bg sound se selecionado. Web Audio API gera pink noise
      // procedural — sem CDN externo, garantido funciona.
      startBgSound(bgSound);
    },
    onDisconnect: () => {
      setCallStatus("ended");
      if (timerRef.current) clearInterval(timerRef.current);
      stopBgSound();
      // Persiste em /calls (idempotente via flag)
      persistCallLog("completed");
    },
    onMessage: (msg: any) => {
      // @elevenlabs/react v1.0.1 manda { message: string, source: "user" | "ai" }
      // Antes eu checava msg.type === "user_transcript" (SDK velho) — nunca
      // batia, por isso o detector nunca firava. Agora aceita ambos shapes
      // pra cobrir update futuro também.
      console.log("[voice-call] msg recebido:", msg);

      const text: string =
        msg?.message ??                                       // SDK v1.x (atual)
        msg?.user_transcription_event?.user_transcript ??     // SDK legacy
        msg?.user_transcript ??
        msg?.transcript ??
        msg?.text ??
        "";

      const source: string =
        msg?.source ??                                        // SDK v1.x
        (msg?.type === "user_transcript" ? "user" :           // SDK legacy
         msg?.type === "agent_response" ? "ai" : "unknown");

      if (!text) return;

      if (source === "user") {
        const newEntry = { role: "user", text };
        transcriptRef.current = [...transcriptRef.current, newEntry];
        setTranscript(prev => [...prev, newEntry]);
        // Match robusto: normaliza (lower, sem acento, sem pontuação) e
        // testa contra cada keyword.
        const normalized = normalizeForKeyword(text);
        const matched = END_CALL_KEYWORDS.find(kw => normalized.includes(normalizeForKeyword(kw)));
        if (matched) {
          console.log(`[voice-call] 🛑 encerramento detectado — keyword "${matched}" em "${text}". Encerrando em 2s.`);
          setTimeout(() => {
            console.log(`[voice-call] forçando endSession (status: ${conversation.status})`);
            conversation.endSession()
              .then(() => console.log("[voice-call] endSession OK"))
              .catch((e) => console.warn("[voice-call] endSession falhou:", e));
          }, 2000);
        }
      } else if (source === "ai") {
        const newEntry = { role: "agent", text };
        transcriptRef.current = [...transcriptRef.current, newEntry];
        setTranscript(prev => [...prev, newEntry]);
      }
    },
    onError: (err: any) => {
      console.error("ElevenLabs error:", err);
      toast.error(typeof err === "string" ? err : err?.message || "Erro na conexão de voz");
      setCallStatus("ended");
      if (timerRef.current) clearInterval(timerRef.current);
      stopBgSound();
      persistCallLog("failed");
    },
  });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const handleStart = useCallback(async () => {
    setCallStatus("connecting");
    setTranscript([]);
    transcriptRef.current = [];
    callLogPersistedRef.current = false;
    setDuration(0);

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Call edge function to auto-create agent and get signed URL
      const { data: sessionData, error: fnError } = await supabase.functions.invoke(
        "elevenlabs-voice-session",
        {
          body: {
            agentName,
            agentPrompt,
            voiceId: selectedVoice,
            firstMessage: agentGreeting,
            language: "pt",
          },
        }
      );

      if (fnError) {
        // Try to extract detailed error from the response context
        let msg = "Erro ao criar sessão de voz";
        try {
          if (fnError.context && typeof fnError.context.json === "function") {
            const body = await fnError.context.json();
            msg = body?.error || msg;
          }
        } catch { /* ignore */ }
        toast.error(msg);
        setCallStatus("idle");
        return;
      }

      if (!sessionData?.signed_url) {
        toast.error(sessionData?.error || "Erro ao obter URL de sessão");
        setCallStatus("idle");
        return;
      }

      await conversation.startSession({
        signedUrl: sessionData.signed_url,
      });
    } catch (err: any) {
      console.error("Failed to start voice:", err);
      if (err?.name === "NotAllowedError") {
        toast.error("Permissão de microfone necessária para usar voz.");
      } else {
        toast.error(err?.message || "Erro ao iniciar ligação.");
      }
      setCallStatus("idle");
    }
  }, [conversation, agentName, agentPrompt, agentGreeting, selectedVoice]);

  const handleEnd = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch {
      setCallStatus("ended");
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [conversation]);

  const handleReset = () => {
    setCallStatus("idle");
    setDuration(0);
    setShowTranscript(false);
  };

  // No ElevenLabs key warning
  if (!hasElevenLabsKey) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-[300px] space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Phone className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-sm font-semibold">Configure seu agente de Ligação</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Para usar o modo de voz, você precisa configurar sua chave de API da ElevenLabs nas Integrações.
          </p>
          <Button size="sm" onClick={onGoToIntegrations} className="gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" /> Ir para Integrações
          </Button>
        </div>
      </div>
    );
  }

  // Transcript view
  if (showTranscript) {
    return (
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4" /> Transcrição
          </h3>
          <Button variant="outline" size="sm" onClick={handleReset} className="text-xs h-7">
            Nova ligação
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3">
          {transcript.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center pt-8">Nenhuma transcrição disponível.</p>
          ) : (
            transcript.map((t, i) => (
              <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                  t.role === "user"
                    ? "bg-primary/10 border border-primary/20 text-foreground"
                    : "bg-muted text-foreground"
                }`}>
                  <span className="text-[10px] text-muted-foreground block mb-0.5">
                    {t.role === "user" ? "Você" : agentName}
                  </span>
                  {t.text}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
      {/* Status badge */}
      <Badge
        variant="outline"
        className={`absolute top-4 right-4 text-[10px] ${
          callStatus === "connected" ? "border-emerald-500/30 text-emerald-500" :
          callStatus === "connecting" ? "border-yellow-500/30 text-yellow-500 animate-pulse" :
          callStatus === "ended" ? "border-muted-foreground/30 text-muted-foreground" :
          "border-border text-muted-foreground"
        }`}
      >
        {callStatus === "idle" && "Aguardando"}
        {callStatus === "connecting" && "Conectando..."}
        {callStatus === "connected" && (conversation.isSpeaking ? "Falando..." : "Ouvindo...")}
        {callStatus === "ended" && "Encerrada"}
      </Badge>

      {/* Animated Orb */}
      <div className="relative mb-2">
        <VoiceOrb
          isSpeaking={callStatus === "connected" && conversation.isSpeaking}
          isConnected={callStatus === "connected"}
          avatarUrl={agentAvatar}
        />
      </div>

      {/* Duration */}
      <p className={`text-2xl font-mono font-light mb-6 tabular-nums ${
        callStatus === "connected" ? "text-foreground" : "text-muted-foreground/50"
      }`}>
        {formatTime(duration)}
      </p>

      {/* Voice selector — escondido quando agente tem voz pré-configurada.
          User vê só uma linha com "Voz: {nome} (trocar)" e pode revelar
          o dropdown clicando em "trocar". */}
      {(callStatus === "idle" || callStatus === "ended") && (
        <div className="mb-6 w-full max-w-[220px]">
          {hasPresetVoice && !voiceSelectorOpen ? (
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Voz do agente</p>
              <button
                type="button"
                onClick={() => setVoiceSelectorOpen(true)}
                className="text-xs text-foreground hover:text-primary transition-colors"
              >
                {VOICES.find(v => v.id === selectedVoice)?.name || "Configurada"}
                <span className="text-muted-foreground ml-1.5 text-[10px]">· trocar</span>
              </button>
            </div>
          ) : (
            <>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Voz</label>
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VOICES.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          {/* Som de fundo da chamada — gerado procedural via Web Audio API
              (multi-camada: rumble + cliques de digitação ou clinks). Não
              substitui gravação real, mas dá feel de chamada com ambient. */}
          <div className="mt-3">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 block">Som de fundo</label>
            <Select value={bgSound} onValueChange={setBgSound}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BG_SOUNDS.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        {callStatus === "connected" && (
          <Button
            variant="outline"
            size="icon"
            className={`h-12 w-12 rounded-full transition-all ${
              isMuted ? "bg-destructive/10 border-destructive/30 text-destructive" : ""
            }`}
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
        )}

        {/* Call button - always visible */}
        <Button
          size="icon"
          className={`h-16 w-16 rounded-full shadow-lg transition-all ${
            callStatus === "connecting"
              ? "bg-yellow-500 hover:bg-yellow-600 animate-pulse"
              : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
          }`}
          disabled={callStatus === "connecting" || callStatus === "connected"}
          onClick={callStatus === "idle" || callStatus === "ended" ? handleStart : undefined}
        >
          <Phone className="h-7 w-7 text-white" />
        </Button>

        {/* Hangup button - always visible */}
        <Button
          size="icon"
          className="h-16 w-16 rounded-full bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/20 transition-all"
          disabled={callStatus !== "connected"}
          onClick={callStatus === "connected" ? handleEnd : undefined}
        >
          <PhoneOff className="h-7 w-7 text-white" />
        </Button>
      </div>

      {/* Post-call actions */}
      {callStatus === "ended" && (
        <div className="flex flex-col items-center gap-3 mt-4">
          <p className="text-xs text-muted-foreground">
            Duração total: {formatTime(duration)}
          </p>
          {transcript.length > 0 && (
            <Button size="sm" onClick={() => setShowTranscript(true)} className="text-xs h-8 gap-1">
              <FileText className="w-3.5 h-3.5" /> Ver transcrição
            </Button>
          )}
        </div>
      )}

      {/* Hint text */}
      {callStatus === "idle" && (
        <p className="text-xs text-muted-foreground text-center mt-6 max-w-[260px]">
          Selecione uma voz e clique no botão para iniciar uma ligação.
        </p>
      )}
    </div>
  );
};

export default VoiceCallPanel;
